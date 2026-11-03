# R7 · T-BE-A.4 — Clinical History Legacy Association Audit

**Status:** Audit complete. No production code changed. **As of:** 2026-07-25 · Backend `4472060` (pre-audit) → this task's own commit (see report) · Frontend `57902bcc` (untouched by this task).

**Scope note (reported, not silently resolved):** `tasks.md`'s own `T-BE-A.4` entry ("Legacy treatment-session classification") is an **Application-layer code task**, explicitly **blocked by "the data audit"** (`R7-HISTORY-HIERARCHY-AMENDMENT.md` §8/§16 — Sheet-to-Plan cardinality), which its own ET note calls "a **prerequisite investigation**, not part of this task's code." That data audit had never been performed. This document **is** that prerequisite audit — it is not a claim that the frozen code task and the audit are the same thing.

---

## 1. Environment audited

**`ENVIRONMENT=development`** (confirmed from `.env` before any query). The configured `DATABASE_URL` is the same Supabase-hosted database flagged in earlier R7 work as **stamped to an unrelated, unmerged branch's Alembic revision** (`feature/progressive-experience-phase-3`). No Alembic command was run against it (only read-only SQL). No migration, no mutation, no write path of any kind was used.

**Read-only safety method:** every query wrapped in `BEGIN READ ONLY; ... ROLLBACK;` via a disposable Python/SQLAlchemy script (`asyncpg`, read-only transaction). No `git`/Alembic state was touched. No credentials appear in this document or in any script output above.

**Decisive finding, before any row count matters:** schema introspection (`information_schema.tables`/`.columns`) shows this database predates two of this branch's own migrations:
- `tenant_treatment_plans` (added by `20260724_000002_r7_treatment_plan.py`, T-BE-D.2) — **table does not exist** in this database at all.
- `tenant_treatment_sheets.creation_source` (added by `20260724_000003_r7_recommendation_source_identity.py`, T-BE-D.3a) — **column does not exist** in this database at all.

**Consequence:** no environment currently reachable from this engagement has *both* real historical tenant data *and* this branch's Treatment Plan schema at the same time. Any Plan-cardinality question (categories A/B/F below) is therefore **structurally unanswerable from live data right now** — not merely "not yet queried." This is itself the audit's central finding.

---

## 2. What was verified vs. reasoned vs. unknown

| Claim | Basis |
|---|---|
| `tenant_treatment_sheets`/`tenant_treatment_sheet_rows`/`tenant_appointments` counts below | **Verified** — direct read-only query, this session |
| Every audited sheet/row predates `creation_source` (`20260724_000003`) | **Verified** — `MAX(created_at)` = 2026-06-30, migration dated 2026-07-24 |
| A DIRECT or legacy-unknown sheet can never have a Plan | **Verified** — `get_eligible_recommendation_source` (`sqlalchemy_treatment_order_repository.py:1330-1355`) hard-filters `creation_source == "RECOMMENDATION"`; already regression-tested (`test_treatment_plan_service.py`) |
| A sheet can never have more than one Plan | **Verified** — `uq_treatment_plans_tenant_recommendation` partial unique index (T-BE-D.3a), DB-enforced |
| Real-world Plan cardinality (1:1 vs. ambiguous) once Plans exist | **Unknown** — no queryable environment has both real data and the Plan schema. Not guessed. |
| Whether the 75 unlinked rows are "legacy" vs. "not yet scheduled" | **Reasoned** — Session Scheduling (`T-BE-E.2`) has not shipped on this branch; there is currently no code path that would bulk-assign `appointment_id`, so an overwhelmingly unlinked row population is expected, not evidence of data loss |

---

## 3. Total records and classification counts

**Total Treatment Sheets:** 18 · **Total Treatment Sheet Rows:** 81 · **Date range (both):** 2026-03-01 to 2026-06-30 (100% pre-dates the `creation_source` discriminator).

| # | Investigation item | Finding |
|---|---|---|
| 1 | Total Treatment Sheet count | **18** |
| 2 | Total Treatment Sheet Row count | **81** |
| 3 | Rows with `appointment_id` | **6** (7.4%) |
| 4 | Rows without `appointment_id` | **75** (92.6%) |
| 5 | Rows whose appointment matches tenant/client/episode | **6 of 6** (100% of linked rows) — 0 conflicts |
| 6 | Rows whose appointment cannot be resolved | **0** — every `appointment_id` FK resolved |
| 7 | Rows whose sheet has a matching Plan via `originating_recommendation_id` | **Unknown** — `tenant_treatment_plans` does not exist in this database |
| 8 | Sheets with multiple/ambiguous Plans | **0, structurally impossible** — DB-enforced partial unique index, not a sample-size artifact |
| 9 | Rows on DIRECT or legacy-unknown source sheets | **All 18 sheets / 81 rows**, by construction (see §1) — `creation_source` does not exist in this DB, and even where it does exist (this branch), every sheet created before 2026-07-24 is `NULL` (legacy-unknown), never backfilled |
| 10 | Rows predating the Recommendation source discriminator | **100%** (18/18 sheets, 81/81 rows) |
| 11 | Safe deterministic backfill possible? | **No — and none attempted.** No Plans exist anywhere queryable; AC-1 ("no automatic backfill without a verified cardinality/data audit") is satisfied by not backfilling, not by this audit resolving cardinality |
| 12 | Existing data conflict that would prevent the history hierarchy | **None found** — 0 cross-tenant/patient/episode conflicts in the 6 linked rows; 0 ambiguous-Plan cases (structurally impossible) |

**Secondary signal (weak, not Plan cardinality):** sheets-per-episode in this dataset — 16 episodes with exactly 1 sheet, 1 episode with 2 sheets. This is **sheet-per-episode**, not sheet-per-Plan (no Plans exist in this data) — offered only as a tangential data point, consistent with `R7-HISTORY-HIERARCHY-AMENDMENT.md` §8's own caution that a 1:1 hypothesis is "reasoned, not verified" and "must not be assumed."

**Additional finding:** all 6 `appointment_id`-linked rows resolve to appointments with `appointment_type = "single"` — none match the verified therapy-shaped vocabulary (`THERAPY`/`therapy`/`therapy_multi_day`) T-BE-A.3's classifier uses. Under the shipped classifier, all 6 currently classify as `CONSULTATION`, not as therapy Sessions at all. This may reflect this database's divergent (unrelated-branch) `appointment_type` convention rather than this branch's own — noted, not resolved, since resolving it would require data this database cannot provide.

---

## 4. Classification (categories per your prompt — used exactly as given, none invented)

| Category | Count | % of 81 rows | Date range | Evidence | Release impact | Runtime fallback |
|---|---|---|---|---|---|---|
| **A** — Deterministically associated to one Plan | 0 | 0% | n/a | No `tenant_treatment_plans` table in this DB; structurally impossible for any pre-2026-07-24 row regardless | None — category is currently empty everywhere audited | n/a |
| **B** — Recommendation source, Plan not yet present | 0 (observed) | 0% | n/a | `creation_source` doesn't exist in this DB; even on this branch, no sheet here predates far enough to test this live | None currently | Already safe — `LEGACY_TREATMENT_SESSIONS` (§4 below), proven in `test_r7_clinical_history_legacy_association_audit.py::TestRecommendationSourceWithNoPlanYet` |
| **C** — Legacy source identity unknown | 18 sheets / 81 rows (structurally, 100%) | 100% | 2026-03-01 – 2026-06-30 | `creation_source` predates all observed data by construction | This is the dominant real-world category today | `LEGACY_TREATMENT_SESSIONS`, already shipped (T-BE-A.3) |
| **D** — Missing appointment association | 75 | 92.6% | 2026-03-01 – 2026-06-30 | Verified: `appointment_id IS NULL` | Expected given Session Scheduling (T-BE-E.2) unshipped; not a data-loss signal | Row has no history item at all — correctly absent, never fabricated |
| **E** — Cross-tenant/patient/Episode conflict | 0 | 0% | n/a | Verified: 0 of 6 linked rows conflict | None found | `WorkspaceContextError` (existing service guard) would reject if ever found |
| **F** — Multiple possible Plans / ambiguous | 0 | 0% | n/a | DB-enforced unique index — structurally impossible, not sample-limited | None, permanently | n/a |
| **G** — Non-therapy / not applicable | 6 | 7.4% | 2026-03-01 – 2026-06-30 | Verified: all 6 linked appointments are `appointment_type="single"` | These are consultations under the shipped classifier, not a Session/Plan question | `CONSULTATION` (already shipped) |

---

## 5. Safe runtime fallback (confirmed already implemented, not newly added)

`classify_history_items` (`app/domain/services/clinical_history_classifier.py`, shipped in T-BE-A.3) already implements exactly the principle this audit was asked to confirm:

- Deterministically associated (`plan_id` resolved via the authoritative chain) → grouped under `TREATMENT_PLAN`.
- Not deterministically associated (therapy-shaped, no resolvable Plan) → `LEGACY_TREATMENT_SESSIONS`, explicit, never merged, never guessed from date/name/proximity.
- Never hides, drops, or mutates a record; never claims a therapy Session is a consultation.

New regression coverage added this task (`tests/test_r7_clinical_history_legacy_association_audit.py`) proves this specifically for the `creation_source`-gated cases this audit investigated: DIRECT source, legacy-unknown (pre-discriminator) source, and RECOMMENDATION-eligible-but-no-Plan-yet — all three fall back to `LEGACY_TREATMENT_SESSIONS`, never a guessed Plan.

---

## 6. Migration / backfill requirement

**None required, none proposed.** No schema change. No data mutation. AC-1 ("no automatic backfill without a verified cardinality/data audit") is satisfied by this audit concluding that cardinality **cannot yet be verified** (no environment has both real data and the Plan schema) — the correct response is to keep the existing safe fallback, not to defer the decision by inventing a partial backfill.

---

## 7. Impact on T-BE-A.5 and frontend Clinical History

- **T-BE-A.5** (session-count correction) is unaffected — it depends only on `T-BE-A.3`, already complete, and does not touch Plan association at all.
- **Frontend Clinical History** (`T-FE-C.5`–`C.7`): no change to what they consume — the `history_items[]` contract's `legacy_treatment_sessions` semantics are unchanged by this audit. `T-FE-C.6`'s own AC ("legacy group rendered with an explicit 'Plan association unavailable' label, never silently merged") remains exactly satisfiable by the existing contract.

---

## 8. RTM / Release Dashboard impact (reported only, not applied)

Clinical History backend: no capability-status change from this task alone (T-BE-A.4 was already counted as in-progress toward the capability by the prior turn's dashboard). This audit **removes an open blocker** — "data audit not yet performed" — clearing the path for `T-BE-A.5` and frontend `T-FE-C.5` work to proceed without an outstanding Plan-cardinality unknown blocking them, since the shipped fallback was confirmed correct rather than assumed correct.
