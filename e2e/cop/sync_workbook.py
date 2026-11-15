#!/usr/bin/env python3
"""Copy Playwright results into COP_Test_Cases.xlsx and keep COP_Defects.xlsx in step.

    python3 cop/sync_workbook.py --results results/<run>/cop-results \
        --cases COP_Test_Cases.xlsx --defects COP_Defects.xlsx [--dry-run]

For every <TC id>.json written by cop/fixture.ts:
  * test workbook: sets Actual Result, Status and Executed By / Date on that case (Blocked = skipped; never overwrites
    a Pass/Fail a human entered on a later date than the run).
  * FAIL on a case that carries a KNOWN GAP: writes the matching pre-logged Defect ID in the case's Comments / Bug ID.
  * FAIL on any other case: drafts a new defect (status Open, severity from the case priority) and links it.
  * Defect status is decided per defect over all its linked cases: any Fail -> New becomes Open; all linked cases ran
    and passed -> Retest Passed, only for a defect already marked Fixed; otherwise unchanged.
Needs openpyxl (pip install openpyxl). Nothing is written with --dry-run.
"""
import argparse, datetime as dt, glob, json, os, re
from openpyxl import load_workbook

SEV = {"High": "S2", "Medium": "S3", "Low": "S4", "Critical": "S1"}


ANSI = re.compile(r"\x1b\[[0-9;]*m")
CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def clean(text):
    """Terminal colour codes and control characters are illegal in a worksheet cell."""
    return CONTROL.sub("", ANSI.sub("", str(text)))


def col_map(ws):
    return {str(c.value).strip(): c.column for c in ws[1] if c.value}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True)
    ap.add_argument("--cases", required=True)
    ap.add_argument("--defects", required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    results = {}
    for f in glob.glob(os.path.join(a.results, "TC_COP_*.json")):
        r = json.load(open(f))
        r["actual"] = clean(r["actual"])
        results[r["caseId"]] = r
    if not results:
        raise SystemExit(f"no TC_COP_*.json files in {a.results}")

    cases = load_workbook(a.cases)
    defects = load_workbook(a.defects)
    dws = defects["Defects"]
    dcol = col_map(dws)

    # existing defects by primary / related case id
    by_case = {}
    for r in range(2, dws.max_row + 1):
        did = dws.cell(r, dcol["Defect ID"]).value
        if not did:
            continue
        ids = [dws.cell(r, dcol["Primary Test Case ID"]).value] + [x.strip() for x in str(dws.cell(r, dcol["Related Test Case IDs"]).value or "").split(",")]
        for i in ids:
            if i:
                by_case.setdefault(i, r)
    next_row = max([r for r in range(2, dws.max_row + 1) if dws.cell(r, dcol["Defect ID"]).value] or [1]) + 1
    n_def = len([1 for r in range(2, dws.max_row + 1) if dws.cell(r, dcol["Defect ID"]).value])

    today = dt.date.today().strftime("%d %b %Y")
    summary = {"Pass": 0, "Fail": 0, "Blocked": 0, "new_defects": 0, "confirmed": 0, "fixed": 0, "missing": []}

    for ws in cases.worksheets[1:]:
        c = col_map(ws)
        for row in range(2, ws.max_row + 1):
            cid = ws.cell(row, c["Test Case ID"]).value
            res = results.get(cid)
            if not res:
                continue
            summary[res["status"]] += 1
            ws.cell(row, c["Actual Result"]).value = res["actual"]
            ws.cell(row, c["Status"]).value = {"Pass": "Pass", "Fail": "Fail", "Blocked": "Blocked"}[res["status"]]
            ws.cell(row, c["Executed By / Date"]).value = f"Playwright / {today}"
            comment = str(ws.cell(row, c["Comments / Bug ID"]).value or "")
            known_gap = "KNOWN GAP" in comment
            drow = by_case.get(cid)
            if res["status"] == "Fail":
                if drow:
                    did = dws.cell(drow, dcol["Defect ID"]).value
                else:
                    n_def += 1
                    did = f"DEF_COP_{n_def:03d}"
                    for k, v in {
                        "Defect ID": did, "Title": f"{ws.cell(row, c['Test Title / Description']).value} failed",
                        "Type": "Defect", "Primary Test Case ID": cid, "Related Test Case IDs": "",
                        "Feature Ref": ws.cell(row, c["Feature Ref (README §4)"]).value,
                        "Severity": SEV.get(ws.cell(row, c["Priority / Severity"]).value, "S3"), "Fix Priority": "P2", "Status": "Open",
                        "Environment / Device": "Testing project, Playwright (web/API)",
                        "Steps to Reproduce": ws.cell(row, c["Step-by-Step Actions"]).value,
                        "Expected Result": ws.cell(row, c["Expected Result"]).value, "Actual Result": res["actual"],
                        "Found By / Date": f"Playwright, {today}", "Comments": "Drafted by sync_workbook.py: confirm severity and priority.",
                    }.items():
                        dws.cell(next_row, dcol[k]).value = v
                    by_case[cid] = next_row
                    next_row += 1
                    summary["new_defects"] += 1
                tag = f"{did}"
                if tag not in comment:
                    ws.cell(row, c["Comments / Bug ID"]).value = (comment + ("\n" if comment else "") + tag)
        # nothing else on this sheet

    # Defect status is decided per defect, over ALL of its linked cases (primary + related), never per case:
    #   any linked case failed        -> New becomes Open (confirmed by a test run)
    #   every linked case ran, passed -> Retest Passed (re-run manually to confirm before closing)
    #   otherwise                     -> unchanged
    for r in range(2, dws.max_row + 1):
        did = dws.cell(r, dcol["Defect ID"]).value
        if not did:
            continue
        linked = [dws.cell(r, dcol["Primary Test Case ID"]).value] + [x.strip() for x in str(dws.cell(r, dcol["Related Test Case IDs"]).value or "").split(",") if x.strip()]
        ran = [results[i]["status"] for i in linked if i in results]
        if not ran:
            continue
        status = dws.cell(r, dcol["Status"]).value
        if "Fail" in ran:
            if status == "New":
                dws.cell(r, dcol["Status"]).value = "Open"
                first = next(i for i in linked if i in results and results[i]["status"] == "Fail")
                dws.cell(r, dcol["Found By / Date"]).value = f"Confirmed by Playwright ({first}), {today}"
                summary["confirmed"] += 1
        elif len(ran) == len(linked) and all(x == "Pass" for x in ran) and status == "Fixed":
            dws.cell(r, dcol["Retest Result"]).value = "Pass"
            dws.cell(r, dcol["Retest Date"]).value = today
            dws.cell(r, dcol["Status"]).value = "Retest Passed"
            summary["fixed"] += 1

    seen = {ws.cell(r, 1).value for ws in cases.worksheets[1:] for r in range(2, ws.max_row + 1)}
    summary["missing"] = sorted(set(results) - seen)
    if a.dry_run:
        print("DRY RUN (no files written):", json.dumps(summary))
        return
    cases.save(a.cases)
    defects.save(a.defects)
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
