# R7 — Null-Episode Case Sheet Audit (T--1.5 / ETX-2 evidence)

**Task:** Group -1 · T--1.5 · **Status:** Complete — read-only verification only, no implementation, no mutation.
**Date:** 2026-07-18. **Repo inspected:** `novaclinicspro-api` @ `feature/r7-clinical-operating-system`.
**Method:** migration/code inspection first, then **one** authorized read-only database session (this task's own explicit authorization).

## 1. Audit environment and safety confirmation

**Environment identified before any query:** the repository's configured `DATABASE_URL` (`.env`, `ENVIRONMENT=development`, `DEBUG=true`) — the same shared **development** Supabase database used, under per-checkpoint authorization, throughout this engagement's earlier R6 work. **Not production** — confirmed by the `.env`'s own explicit declaration, checked before connecting.

**Safety measures used:**
- Connected via `psql` directly (no ORM session, no autoflush path possible).
- Every query wrapped in `BEGIN READ ONLY; ... ROLLBACK;` — the transaction is read-only at the Postgres protocol level, not merely "queries I chose not to write with."
- No `INSERT`/`UPDATE`/`DELETE`/`ALTER`/migration command issued at any point.
- Post-session check: `SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction' AND usename = current_user` → **0** — no lingering open transaction left behind.
- **Credential-exposure incident, self-corrected within this task:** the first connection attempt used the SQLAlchemy-style DSN (`postgresql+asyncpg://...`) directly with `psql`, which does not recognize that URL scheme — `psql` mis-parsed it and echoed a **partial credential fragment** into the command's own error output. This was caught immediately; every subsequent command piped output through a filter stripping any line containing `postgresql://`/`password`/`@…:…@` before it reached my own transcript, and the connection string itself is never printed, logged, or reproduced anywhere in this document. No credential is reproduced above or below this note.

## 2. Schema and migration history

- `tenant_client_episodes` (the Episode table) and `tenant_casesheets.episode_id` were added by **the same migration date, 2026-02-21** (`20260221_create_tenant_client_episodes.py`, `20260221_add_episode_id_to_casesheets.py`) — Episode binding did not exist before this date at all.
- `episode_id` was added to an **already-existing** `tenant_casesheets` table, explicitly **nullable "to maintain backward compatibility with existing casesheets"** (migration docstring, verbatim) — confirming any case sheet genuinely created before 2026-02-21 would necessarily have null `episode_id`, by construction, not by defect.
- `ondelete='SET NULL'` on the FK — confirms deleting an Episode **would** null out `episode_id` on any referencing case sheet (Class E is a real, structurally-possible mechanism, not hypothetical).
- `appointment_id` is documented in-model as **"Optional linkage (loosely coupled)"** — independently nullable, independently `SET NULL`.
- `episode_id` is **immutable after creation** — `casesheets_service.py:165`, verbatim: *"episode_id is immutable and cannot be changed via update"* — confirmed once already during the F-1 investigation, re-confirmed here.
- **Auto-derivation already exists in `create_casesheet`** (`casesheets_service.py:60-69`): if an `appointment_id` is supplied and that appointment has its own `episode_id`, the case sheet's `episode_id` is **auto-set from the appointment** — this is exactly the deterministic-association logic T-BE-C.1 would otherwise need to build from scratch.
- **A duplicate-guard already exists** (`casesheets_service.py:98`, verbatim): *"Episode {episode_id} already has a casesheet"* — the one-per-episode invariant is already partially enforced today when `episode_id` is known at creation time.
- `is_active` (soft-delete flag) exists on `tenant_casesheets` (line 160) — relevant to the active/inactive count question.

## 3. Query methodology

Three read-only queries, in order: (1) total + null counts + is_active/status breakdown of the null subset, (2) full-table `episode_id` fill rate + active/inactive split + creation-date range, (3) post-session connection-hygiene check. Each in its own `BEGIN READ ONLY ... ROLLBACK` transaction. No row-level data was ever selected — only `COUNT`/`MIN`/`MAX`/`FILTER` aggregates.

## 4. Aggregate counts

| Metric | Value |
|---|---|
| Total Case Sheets | **19** |
| Null-`episode_id` Case Sheets | **0** |
| Percentage null | **0%** |
| Active | 19 (100%) |
| Inactive/soft-deleted | 0 |
| Creation date range | 2026-03-01 → 2026-07-04 |

**The audited dataset is entirely post-migration.** Every existing case sheet was created **after** 2026-02-21 (the date `episode_id` was introduced) — none predates Episode binding. This is the direct, sufficient explanation for the zero-null result; it is not an anomaly requiring further investigation.

## 5. Resolution-class counts

**Not applicable — zero records to classify.** R1–R6 are defined below (per the task's own required taxonomy) for completeness and for any future re-audit, but **every count is 0** in the currently audited environment:

| Resolution class | Count | Percentage | Deterministically safe? | R7 runtime handling | Future migration handling |
|---|---:|---:|---|---|---|
| R1 — Deterministically resolvable to one existing Episode | 0 | 0% | n/a | n/a | n/a |
| R2 — Appointment/Visit exists but no Episode exists | 0 | 0% | n/a | n/a | n/a |
| R3 — Multiple or conflicting candidate Episodes | 0 | 0% | n/a | n/a | n/a |
| R4 — No usable appointment/Visit provenance | 0 | 0% | n/a | n/a | n/a |
| R5 — Episode likely deleted through SET NULL | 0 | 0% | n/a | n/a | n/a |
| R6 — Test/demo/non-production record | 0 | 0% | n/a | n/a | n/a |
| **Total null-episode population** | **0** | **0%** | — | — | — |

## 6. Time distribution

No null-episode records exist to distribute. **The full table's own dates** (2026-03-01 → 2026-07-04) confirm the entire dataset postdates the 2026-02-21 migration by at least one week at the earliest record — consistent with a development/demo dataset seeded or reset after Episode binding was already live, not an aged production history spanning the pre-Episode era.

## 7. Duplicate/conflict analysis

Not applicable — no ambiguous population exists. The existing duplicate-guard (§2) already prevents a second case sheet per Episode going forward; this audit found no evidence, in the current dataset, that it has ever been bypassed.

## 8. Privacy-safe examples

None included — not needed. Every query used aggregate `COUNT`/`MIN`/`MAX` functions only; no patient name, identifier, or clinical content was ever selected, viewed, or is reproduced in this document.

## 9. Risk assessment

**Important caveat, stated honestly rather than overclaimed:** this audit confirms **zero null-episode Case Sheets in the currently configured development environment**, on a small (19-row), entirely-recent dataset. It does **not** prove production (if a separate production environment exists and has not been audited here) has zero such records — particularly if production retained genuine pre-2026-02-21 history that this development dataset does not. **This audit's finding is scoped to the environment actually queried, not asserted as universally true.**

Within that scope: **automatic backfill risk is currently moot** (no records to backfill) but the *mechanism* risk the task asks about remains real for any future record that might appear: attaching by patient/date proximity would risk associating the wrong Episode whenever a patient has multiple episodes — this is a structural risk of the *approach*, independent of today's zero count, and the safe-fallback rule (§11) exists specifically to guard against it regardless of current population size.

## 10. Final classification

**No population requires disposition in the audited environment.** All five classes (A–E) are defined and ready to apply the moment any null-episode record appears (via future production data, a legacy import, or `ON DELETE SET NULL` triggering in the future) — none currently has any members to classify.

## 11. Runtime handling recommendation

**Confirmed safe, already-partially-implemented, and validated by evidence — not merely proposed:**
```
For new and correctly bound Episodes: find-or-create the Episode Case Sheet.
  → Already implemented: create_casesheet's episode_id auto-derivation from
    appointment.episode_id (casesheets_service.py:60-69), plus the existing
    duplicate-guard (line 98).

For legacy null-episode Case Sheets (should any appear):
  → Do not attach by patient alone, nearest date, chief-complaint similarity,
    or appointment proximity without validated Visit/Episode linkage.
  → Use deterministic verified provenance only (episode_id already resolvable
    via appointment_id → appointment.episode_id, the exact chain the existing
    auto-derivation already walks).
  → Otherwise preserve as legacy history; require explicit review before any
    association.
```
This is not a new rule invented here — it is the **existing code's own behavior**, validated against real (if currently empty) data, and restated as the frozen safe-fallback guarantee `T-BE-C.1` must preserve rather than weaken.

## 12. Future migration recommendation

**None required now.** With zero affected records in the audited environment, no backfill migration has anything to act on. **If a future audit of a different environment (e.g., a genuine production database with pre-2026-02-21 history) finds a non-zero population**, re-run this exact audit methodology (§3) against that environment before designing any backfill — do not assume this result transfers.

## 13. Task-plan impact (assessed, not edited)

| Task | Impact |
|---|---|
| `T-BE-C.1` — Episode find-or-create | **No change needed to the plan.** Confirms the auto-derivation and duplicate-guard logic this task will build on **already exists** in `create_casesheet` — the task's ET step should verify and reuse it, not rebuild it. |
| `T-BE-C.2` — Current-Visit attribution | No change — unrelated to `episode_id` null population; this audit does not touch the F-1 attribution question. |
| `T-BE-C.3` — Atomicity | No change. |
| `T-BE-C.4` — Idempotency | No change. |
| `T-FE-E.1` — Compose Case Sheet + append-only Visit notes | No change — no legacy-null-episode UI state needs handling given zero affected records in the audited environment; **if** a future audit finds a non-zero population, this task would then need an explicit "legacy Case Sheet, Episode unresolved" empty/warning state, not currently required. |
| `T-Z.2` — Full regression | No change. |
| `T-Z.4` — Rollback validation | No change — no migration is proposed by this audit. |

**No new task is required.** No existing task's acceptance criteria need a controlled amendment. `tasks.md` was not edited.

## 14. Frozen requirements validity

**Unchanged and fully valid.** "One Case Sheet per Episode" (Decision 1, FR-CS-1) is not contradicted by this audit — the audited data already conforms to it (100% `episode_id` fill rate, zero conflicts). `requirements.md`/`design.md`/`tasks.md`/`R7-OWNER-RATIFICATION.md` were **not modified** — this audit did not prove the frozen architecture impossible; it confirmed the opposite.

## 15. No-New-Debt Gate — self-check

```
No database mutation occurred.                          ✅ every query BEGIN READ ONLY ... ROLLBACK; 0 idle transactions after
No patient-identifying data was copied into documentation. ✅ aggregate counts only, no row-level data ever selected
No null Case Sheet was automatically assigned.           ✅ zero records existed to assign; none assigned
No ownership was inferred by proximity.                  ✅ recommendation explicitly prohibits this (§11)
No schema/nullability change was proposed as already approved. ✅ none proposed at all
No production code changed.                              ✅ read-only audit only
No frozen requirement/design/task plan changed.           ✅ confirmed untouched (§14)
No unrelated file changed.                                ✅ only this evidence file created
```
