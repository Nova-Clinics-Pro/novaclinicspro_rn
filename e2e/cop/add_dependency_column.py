#!/usr/bin/env python3
"""Adds a "Dependency" column to the COP test-case tabs and fills it for every case that is Not Run or Blocked.

    python3 cop/add_dependency_column.py COP_Test_Cases.xlsx

A case that has a Pass or Fail has nothing to wait for, so its Dependency cell is cleared. Safe to re-run: the column is
found by its header and rewritten. The text says what has to exist before the case can be run, not why it failed.
"""
import copy, sys
from openpyxl import load_workbook
from openpyxl.styles import Alignment

DEVICE = "Android or iOS device (or emulator) running the native app build; the test machine does not have the memory to run an emulator"
PUSH = "Physical Android and iOS devices with a native app build and push notifications (FCM/APNs) enabled; push cannot be tested on web or at API level"
SERIES = ("Defect fix DEF_COP_060: no migration or seed writes appointments.core.settings.multiday_appointment_types, so the booking form offers no series "
          "even with the Capability Platform flag on and appointments.multiday enabled for the clinic (both done for this run). Ayurveda and Physio only; never General")
INVOICE = "Defect fix: invoice and payment creation answer 500 (DEF_COP_018, finance_router user_context.user_id); billing cannot run until it is fixed"

DEPENDENCY = {
    **{f"MOB_{i:03d}": DEVICE for i in range(1, 13)},
    "NTF_008": PUSH, "NTF_009": PUSH, "THR_005": PUSH,
    "PRT_007": "Physical printer and pre-printed letterhead paper (manual check of alignment)",
    "PRT_008": "Physical printer and A4 plain paper (manual check of margins)",
    "PRT_009": "Android or iOS device with the system print dialog (native app build)",
    "PRT_010": "Android or iOS device with a share sheet and a PDF viewer (native app build)",
    "UIX_010": "Android or iOS device with a screen reader (TalkBack or VoiceOver) enabled",
    "NPH_001": "Out of MVP scope: Nurse and Pharmacist roles are deferred to a later cycle (decision 'Later'); nothing to run in this cycle",
    **{k: SERIES for k in ("RCP_009", "RCP_010", "CNF_011", "CNF_012", "CNF_013", "NFR_009")},
    "ADM_006": INVOICE, "RCP_021": INVOICE, "RCP_022": INVOICE, "DSH_004": INVOICE,
    "CNF_014": "A second Receptionist login in the same clinic (each login needs an Auth user and a staff link; the Auth email rate limit applies)",
    "CNF_005": "Not applicable: a General clinic has no therapy, so there is nothing to book or gender-match (case needs a clinic type with therapy, and gender matching is a therapy rule)",
    "OWN_015": "One login that belongs to two clinics (a multi-clinic owner); the test logins each belong to one clinic",
}
HEADER = "Dependency"

def main(path):
    wb = load_workbook(path); filled = cleared = 0
    for ws in wb.worksheets:
        head = [c.value for c in ws[1]]
        if "Test Case ID" not in head or "Status" not in head:
            continue
        idc, stc = head.index("Test Case ID") + 1, head.index("Status") + 1
        if HEADER in head:
            col = head.index(HEADER) + 1
        else:
            col = ws.max_column + 1
            src = ws.cell(1, col - 1); dst = ws.cell(1, col, HEADER)
            dst.font, dst.fill, dst.border, dst.alignment = copy.copy(src.font), copy.copy(src.fill), copy.copy(src.border), copy.copy(src.alignment)
            ws.column_dimensions[dst.column_letter].width = 60
        for row in range(2, ws.max_row + 1):
            tc = str(ws.cell(row, idc).value or ""); status = str(ws.cell(row, stc).value or "")
            key = tc[-7:]; cell = ws.cell(row, col)
            if status in ("Not Run", "Blocked", "None", "") and key in DEPENDENCY:
                cell.value = DEPENDENCY[key]; cell.alignment = Alignment(wrap_text=True, vertical="top"); filled += 1
            else:
                if cell.value: cleared += 1
                cell.value = None
    wb.save(path); print(f"dependency column: {filled} filled, {cleared} cleared")

if __name__ == "__main__":
    main(sys.argv[1])
