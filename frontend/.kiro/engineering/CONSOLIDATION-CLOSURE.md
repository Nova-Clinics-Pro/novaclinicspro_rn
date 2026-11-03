# Consolidation Closure Record (2026-11-03)

Status: recorded on `integration/refactoring-consolidated` in both the frontend and backend
repositories. This document is identical in both repositories. It records decisions, open
engineering items and the local-state plan. It contains no secrets and no environment values.

## 1. Decisions applied

| Topic | Decision |
|---|---|
| Doctor-workflow stash (`stash@{1}`, `doctor-workflow-uncommitted.patch`) | The `CompleteConsultationScreen.tsx` change is **excluded**: it conflicts with R7 T-0.8 (commit `cd48984d`) and the backend-owned ConsultationCompletion contract. The URL-parameter doctor-history implementation (`mode=doctor-history`, `doctorPatientHistoryRoute`) is **not integrated**. Both sources are preserved byte-for-byte in the recovery archive; the stash was not applied or dropped and the loose patch was not deleted. |
| R8 Failure D | Recorded as a pending engineering item (section 2, item 3). |
| Doctor patient-history gating | A future implementation **must be permission-driven** (RBAC), never controlled by a forgeable URL parameter. Hiding UI is presentation polish, not authorization. |
| `CLAUDE.md` | The expanded frontend Layer Integrity rule (with forbidden patterns and the mandatory pre-implementation audit) and a Repository Workspace Policy were incorporated from `stash@{0}`. The workspace policy is identical in both repositories. The Commercial Platform branch rule and the backend workflow rules are preserved. |
| Nine empty `/tmp` worktrees | **Permanently unverifiable.** Their former uncommitted contents were lost and were not recovered. |

## 2. Cleanup and engineering backlog (not implemented)

| # | Item | Applies to |
|---|---|---|
| 1 | B2.9 bulk-job mapping gap: migration `20261016_000003` adds `tenant_inventory_movements.bulk_job_id` and `bulk_row_index` (with a provenance CHECK constraint) that no ORM model or application code maps or uses. | Backend |
| 2 | Inventory acceptance and recovery/reconciliation: `tests/integration/test_inventory_postgres_acceptance.py` ends in a deliberate "live execution disabled" failure because exact-ID recovery and interrupted-run reconciliation are not implemented. | Backend |
| 3 | R8 Failure D: "View Patient History" opens admin client management with admin affordances. Fix must be permission-driven; the doctor's destination must be role-owned. | Frontend (backend permission contract) |
| 4 | Pending migrations: `20261015_000001` (already committed earlier) through `20261025_000001` are not applied to the development database (at `20261014_000002`); applying them needs separate approval. The commercial-platform migration line is separate. | Backend |
| 5 | Current-contract frontend characterization: the historical `/me` status characterization was reverted as superseded; add a characterization of the current registration status contract. | Frontend |
| 6 | Reconstructed Expo Go test coverage gap: `expoPushRuntimeCompatibility.test.ts` was reconstructed (11 cases); the architecture note claims 15 original cases. | Frontend |
| 7 | R7 document structure: the 2026-10-04 D5-OD block now sits inside Decision 13 (dated 2026-10-02). Consider a dated clarification or restructure. | Frontend |
| 8 | Backend whitespace warnings: `git diff --check` reports 78 warnings in imported source and documents. | Backend (and a few docs) |
| 9 | Credential hygiene investigation: a JWT-shaped string exists in the excluded `frontend/docs/backend_test.py`; `scripts/reset_supabase_password.py` was excluded unreviewed; treat as exposed until investigated and rotated if real. | Both |
| 10 | Inherited baseline test failures: backend 55 (database resolution, constructor and guard tests) and frontend 14 (`cp-boundary-guard`); one flaky frontend case in `caseSheetModuleComposition`. | Both |
| 11 | `CLAUDE.md` policy consistency: keep the frontend and backend Repository Workspace Policy identical; retire references to permanent worktrees elsewhere. | Both |
| 12 | Behavioral tests for the appointment web fixes (currently source-level assertions for the detail-screen guards and post-create navigation). | Frontend |

## 3. Local-state migration plan (planning only — nothing created, copied, moved or linked)

Proposed root: `~/.novaclinics-local/` (directory mode 700, files mode 600). Nothing under this
plan has been executed. Each step requires separate approval, and values must never be read,
printed, hashed or committed.

| Local state | Current location (original checkouts) | Proposed handling |
|---|---|---|
| Frontend `.env` | `novaclinicspro_rn/frontend/.env` | Owner copies to `~/.novaclinics-local/frontend/.env`; consuming worktree links or loads it explicitly |
| Backend `.env`, `.env-test.yml` | `novaclinicspro-api/novaclinicspro-api/` | Owner copies to `~/.novaclinics-local/backend/`; load explicitly |
| `.mcp.json` (both) | main checkouts | Owner reviews, then keeps under the local root; never committed |
| `.claude` settings (`settings.json`, `settings.local.json`) | main checkouts | Same; agents/commands/skills markdown already archived |
| `ios/.xcode.env.local` | `novaclinicspro_rn/frontend/ios/` | Regenerated by the iOS toolchain; or kept under the local root |
| Python virtual environments | `novaclinicspro-api/.../venv`, `novaclinicspro-api-b27-clean-integration/.venv` | Not copied; recreate from `requirements.txt` after install approval |
| Frontend `node_modules` | `novaclinicspro_rn/frontend/node_modules` | Not copied; reinstall in a permanent location after install approval |

**Candidate paths that currently depend on the original checkouts**

| Dependency | Detail |
|---|---|
| Frontend `frontend/node_modules` | Symlink to `novaclinicspro_rn/frontend/node_modules` |
| Frontend worktree metadata | `.git` file points to `novaclinicspro_rn/.git/worktrees/novaclinics-refactoring-consolidated-frontend` |
| Backend worktree metadata | `.git` file points to `novaclinicspro-api/novaclinicspro-api/.git/worktrees/novaclinics-refactoring-consolidated-backend` |
| Backend test interpreter | Tests were run with `novaclinicspro-api-b27-clean-integration/.venv/bin/python` |
| Frontend ignore rule | `frontend/node_modules` was added to the shared `.git/info/exclude` of `novaclinicspro_rn` |
| Backend candidate | Has no `.env`; runtime and database work cannot start without one supplied by the owner |

Consequence: the original checkouts `novaclinicspro_rn` and `novaclinicspro-api/novaclinicspro-api` own
the Git directories of the candidate worktrees and must remain until the candidates are re-homed.
