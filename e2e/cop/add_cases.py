#!/usr/bin/env python3
"""Adds new COP cases to the test workbook (and the defect workbook's Case_Index) without touching existing rows.

    python3 cop/add_cases.py COP_Test_Cases.xlsx COP_Defects.xlsx

Idempotent: a case whose ID is already present is skipped. New rows copy the style of the tab's last row, start as Not Run,
and the Case_Index range used by the defect sheet's lookups and drop-downs is extended to cover them.
"""
import copy, re, sys
from openpyxl import load_workbook

TAB = "14_NonFunctional_Arch_Perf_RLS"
CASES = [
    dict(id="TC_COP_NFR_015", scenario="Time zones", title="A booked slot is stored in UTC and shown in the viewer's local time zone", module="Time handling", ref="X-*", dep="",
         decision="Positive", pre="An appointment can be booked; a browser in each of two time zones (Asia/Kolkata, America/New_York)", data="Slot 2047-08-12 05:30 UTC (11:00 in India)",
         env="Web (laptop) · API · Testing database",
         steps="1. Book the slot with an explicit UTC instant.\n2. Read the stored value from the database and the column type.\n3. Open the appointment in a browser set to India time and in one set to New York time.",
         exp="The database column is timestamp with time zone and holds exactly that instant (UTC); the API returns the same instant; the screen shows 11:00 am in India and 1:30 am in New York (the viewer's local time)."),
    dict(id="TC_COP_NFR_016", scenario="Time zones", title="Series sessions are stored in UTC and shown in local time", module="Time handling", ref="X-*", dep="",
         decision="Positive", pre="Multi-day booking available; browser in India time", data="7-day series from a Monday at 11:00 local (05:30 UTC)",
         env="Web (laptop) · API · Testing database",
         steps="1. Preview the series at 11:00 local.\n2. Confirm it.\n3. Read each created appointment's stored start and the screen's time.",
         exp="Each session is stored as 05:30 UTC (11:00 local) and the appointment screen shows 11:00 am in India time."),
    dict(id="TC_COP_NFR_017", scenario="Time zones", title="Recommended (alternative) slot times are UTC in the API and local on screen", module="Time handling", ref="X-*", dep="",
         decision="Positive", pre="Multi-day booking available; therapist busy on one day of the series; browser in India time", data="Series at 11:00 local, therapist busy on day 3",
         env="Web (laptop) · API",
         steps="1. Preview the series; open the conflicted day.\n2. Read the recommended times from the plan response and on screen.",
         exp="Alternatives are offered; each is a UTC instant in the API and is shown on screen in the viewer's local time, inside the clinic's local operating hours."),
]

def main(cases_path, defects_path):
    wb = load_workbook(cases_path); ws = wb[TAB]
    head = [c.value for c in ws[1]]; col = {h: i + 1 for i, h in enumerate(head)}
    existing = {str(ws.cell(r, 1).value) for r in range(2, ws.max_row + 1)}
    added = []
    for case in CASES:
        if case["id"] in existing: continue
        r = ws.max_row + 1
        for c in range(1, ws.max_column + 1):
            s, d = ws.cell(r - 1, c), ws.cell(r, c)
            d.font, d.fill, d.border, d.alignment, d.number_format = copy.copy(s.font), copy.copy(s.fill), copy.copy(s.border), copy.copy(s.alignment), s.number_format
        values = {"Test Case ID": case["id"], "Test Scenario": case["scenario"], "Test Title / Description": case["title"], "Module / Feature": case["module"],
                  "Feature Ref (README §4)": case["ref"], "Depends On": case["dep"] or None, "Decision / Branch": case["decision"], "Pre-conditions": case["pre"],
                  "Test Data": case["data"], "Environment / Device": case["env"], "Step-by-Step Actions": case["steps"], "Expected Result": case["exp"],
                  "Actual Result": None, "Status": "Not Run", "Priority / Severity": "High", "Automatable By": "Web – Playwright", "Executed By / Date": None, "Comments / Bug ID": None}
        for k, v in values.items():
            if k in col: ws.cell(r, col[k]).value = v
        added.append((case["id"], case["title"]))
    wb.save(cases_path)

    wd = load_workbook(defects_path); ci = wd["Case_Index"]; indexed = {str(ci.cell(r, 1).value) for r in range(2, ci.max_row + 1)}
    old_last = ci.max_row
    for cid, title in added:
        if cid in indexed: continue
        r = ci.max_row + 1
        for c in range(1, ci.max_column + 1):
            s, d = ci.cell(r - 1, c), ci.cell(r, c)
            d.font, d.fill, d.border, d.alignment, d.number_format = copy.copy(s.font), copy.copy(s.fill), copy.copy(s.border), copy.copy(s.alignment), s.number_format
        ci.cell(r, 1).value, ci.cell(r, 2).value, ci.cell(r, 3).value, ci.cell(r, 4).value = cid, TAB, title[:60], "High"
    new_last = ci.max_row
    if new_last != old_last:  # widen every lookup and drop-down that points at Case_Index
        for sheet in wd.worksheets:
            for row in sheet.iter_rows():
                for cell in row:
                    if isinstance(cell.value, str) and "Case_Index!" in cell.value:
                        cell.value = re.sub(rf"(Case_Index!\$[ABCD]\$2:\$[ABCD]\$){old_last}\b", rf"\g<1>{new_last}", cell.value)
            for dv in sheet.data_validations.dataValidation:
                if dv.formula1 and "Case_Index!" in dv.formula1:
                    dv.formula1 = re.sub(rf"(Case_Index!\$[ABCD]\$2:\$[ABCD]\$){old_last}\b", rf"\g<1>{new_last}", dv.formula1)
    wd.save(defects_path)
    print(f"added {len(added)} case(s): {[a for a, _ in added]}; Case_Index rows {old_last}->{new_last}")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
