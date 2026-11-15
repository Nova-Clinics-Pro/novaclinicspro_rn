# COP automation (Playwright)

Automates the cases in `COP_Test_Cases.xlsx` marked *Web – Playwright* and logs failures in `COP_Defects.xlsx`.
Every test title starts with its workbook ID (`TC_COP_RCP_004 …`), which is how results find their way back.

| File | Purpose |
|---|---|
| `seed-plan.ts` | **The dependency plan**: 17 steps in the order the app requires, the rule behind each order, the check after each step, and the workbook cases each step unlocks. Also writes `SEED-PLAN.md` (`npx tsx cop/plan-to-md.ts`). |
| `seed-data.ts` | The records from tab `00_Setup_And_Data`: rooms, staff, treatments, usables, stock, patients, operating hours. |
| `seed.ts` | Runs the plan in order in the synthetic `NC-WEB-UAT-*` clinics. A step runs only if the steps it needs passed. `--plan` prints the plan with no network. Dry run by default. |
| `uat_env.py` | **Always start runs through this.** Reads the Testing URL and public key from the backend's `.env-testing` (never printed), refuses any other Supabase project, and drops the rest of the environment. |
| `register-owners.ts` | Registers the two synthetic clinic owners (S01) through the app's own API call. |
| `fixture.ts` | Test fixture: signs in as the seeded clinic owner, writes `<run>/cop-results/<TC id>.json` after each test. |
| `sync_workbook.py` | Copies results into the test workbook and keeps the defect log in step. |
| `../web/tests/cop/*.spec.ts` | The specs. |

## Run order

Every command goes through the launcher, e.g. `NC_RUN_ID=<run> python3 cop/uat_env.py npx tsx cop/seed.ts --plan`.

1. Start the UAT backend (port 8000) from `.env-testing`. The Playwright API specs need no web build.
2. `npm ci` in `e2e/` (once).
3. Register the clinic owners: `... uat_env.py npx tsx cop/register-owners.ts`.
4. Print the plan (`... cop/seed.ts --plan`), then seed (dry run first): `... cop/seed.ts`, then `... cop/seed.ts --apply`.
5. Run the COP specs: `... uat_env.py npx playwright test -c web/playwright.config.ts tests/cop`.
6. Sync: `python3 cop/sync_workbook.py --results results/<run>/cop-results --cases COP_Test_Cases.xlsx --defects COP_Defects.xlsx` (add `--dry-run` to preview).

Use the same `NC_RUN_ID` in every step.

## Rules

- **Seeding is idempotent.** Existing names are reused. It refuses to seed a clinic whose name is not a synthetic `NC-*-UAT-*` clinic, and a non-local API unless `NC_ALLOW_REMOTE_API=1`.
- **Staff are created without a login.** That makes no Auth user and sends no email. `--with-logins` creates logins, sends activation emails and is rate limited; use it only with the owner's approval.
- **`@known-gap` tests are expected to fail** until the matching defect is fixed. Run without them with `--grep-invert @known-gap`. When one starts to pass, `sync_workbook.py` moves its defect to *Retest Passed* only if all of the defect's linked cases ran and passed.
- **A skipped test is *Blocked*, not Pass.** The reason is in the Actual Result.
- Nothing here stores passwords or tokens. Result files hold ids and status only.

## Seed order in one line

S01 clinic → S02 rules, S03 hours, S04 rooms, S05 staff, S06 category → S07 treatments → S08 stock → S09 usables (needs S07 + S08) → S10 patients → S11 workspace preparation → S12 commercial trial (without it booking is refused) → S13 role logins (approval) → S14 appointments → S15 episode, case sheet, prescription → S16 treatment sheet and order → S17 session, billing, stock. S14 to S17 are created by the test cases, not the seeder. Details and reasons: `SEED-PLAN.md`.

## Guard

`shared/config.ts` has `assertTestingSupabase()`, called before every Supabase request. Without the launcher the framework's default config (`~/.novaclinics-local/frontend/.env`) points at a different Supabase project, so it refuses to run rather than create users there.

## What is automated so far (11 of 161 Playwright-capable cases)

`RCP_004`, `RCP_005`*, `RCP_006`, `RCP_008`*, `CNF_001`–`CNF_005`, `OWN_014`, `NFR_002` (* known gap). First run (cop261115): 6 pass, 4 fail (room type ×2, room double-booking, gender matching), 1 blocked (General clinic has therapy off). These run against the API. UI flows, role logins (admin, receptionist, doctor, therapist) and the journey tab are next.
