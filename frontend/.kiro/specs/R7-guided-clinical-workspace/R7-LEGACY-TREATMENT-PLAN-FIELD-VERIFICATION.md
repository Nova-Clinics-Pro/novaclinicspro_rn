# R7 — Legacy `tenant_visits.treatment_plan` Field Verification (T--1.4 / ETX-5 evidence)

**Task:** Group -1 · T--1.4 · **Status:** Complete — verification only, no implementation.
**Date:** 2026-07-18. **Repos inspected:** `novaclinicspro-api` @ `feature/r7-clinical-operating-system` (`deee408`) · `novaclinicspro_rn` @ `feature/r7-clinical-operating-system` (`547307e8`).
**Added consideration (this invocation, post v1.1 history-hierarchy amendment):** whether the legacy visit text is appropriate to display inside a doctor Consultation history entry as a visit narrative — **it must never establish Treatment Plan existence or Session grouping.**
**Method:** direct source inspection — ORM model, service, migrations, printed-document builder, localization, frontend DTOs/entities. **No database queried.** All findings **(a) verified**, exact citations.

## 1. Usage census

`tenant_visits.treatment_plan: Mapped[str | None]` (`sa.Text()`, nullable) — added `7c93b2118d3b_0019_add_finance_and_visits_tables.py:36`.

**Confirmed live, not vestigial:**
- **Grouped as a "Visit Note" field**, alongside `chief_complaint`/`diagnosis`/`notes` — `_VISIT_NOTE_FIELDS = frozenset({"chief_complaint", "diagnosis", "treatment_plan", "notes"})` (`visits_service.py:24`).
- **Readable** via `get_visit_note()` — a dedicated labeled read view over these four fields (`visits_service.py:140-158`, docstring: *"Phase 2 · T-D.1... The Visit Note is a labeled read model over the Visit's own existing clinical fields... distinguished here from the Case Sheet's own longitudinal fields"*).
- **Writable** via the generic `update_visit(visit_data: dict, ...)` path — no dedicated schema field/route names it directly (`visits_router.py` has zero mentions), but it is one of the four fields that path's own completion-lock guard covers: *"if `visit_data` touches any Visit Note field... and the owning Appointment's status is COMPLETED, the update is rejected"* (`visits_service.py:169-175`).
- **Rendered in printed clinical documents** — `document_header_builder.py:660-664` emits `<h3>Treatment Plan</h3><p>{value}</p>` when present.
- **Properly localized** — `app/localization/dictionaries/labels.py` carries the label in English/Telugu/Hindi (lines 37/86/135/184).
- **Echoed in a read-only presentation schema** — `app/api/v1/schemas/finance.py:23-91`, explicitly documented there as *"these are the SAME underlying Visit fields... this model is a presentation/labeling"* schema, not a separate write path.

**Confirmed absent from the frontend** — exhaustive search of `features/`/`core/` for `treatment_plan` returns exactly one hit (`treatmentOrders.dtos.ts`), and that hit is a **code comment** citing the unrelated Python path `app/domain/treatment_plan/lifecycle_status.py` (see §2, namespace (e)) — **not** a reference to this field. **No frontend screen displays `tenant_visits.treatment_plan` today.**

## 2. Naming-collision guard — four distinct namespaces, not two

The original ETX-5 framing anticipated a single collision (this field vs. the future entity). Verified: there are **four**.

| Namespace | What it actually is | Relation to this field |
|---|---|---|
| (a) `tenant_visits.treatment_plan` | **This field** — free-text Visit Note column | — |
| (b) `app.application.treatment_plan` (package) | Scheduling-**sync** use cases (`SyncTreatmentPlanWithSchedule`, `CreateOrUpdateTreatmentSheetUseCase`, `CreateOrUpdateAppointmentSeriesUseCase`) | **Unrelated** — a module namespace for schedule synchronization, not this column |
| (c) `tenant_treatment_plan` (future table) | The **R7 entity** FR-TP-1/`T-BE-D` will create | The collision this ETX exists to prevent |
| (d) `data_json` template field `"treatment_plan"` | A reusable textarea field definition inside clinical-document **templates** (`c12d5e476ec8_add_clinical_documents_system.py`, 4 occurrences) | Same *label*, different *mechanism* — a template field, not this DB column |
| (e) `app/domain/treatment_plan/` (directory) | Already contains `lifecycle_status.py` (`TreatmentLifecycleStatus`) **and** `sync_result.py` — **this is `T-BE-D.1`'s own target directory** for the new domain object | **New finding, relevant to `T-BE-D.1`**: the new Plan domain object must coexist with this directory's existing, unrelated content — not collide with it |

**Guard (unchanged from the original ETX-5, now sharper):** implementers must treat these as **four separate things sharing a label**, not two. `T-BE-D.1` in particular should note finding (e) — its target directory is not empty.

## 3. New consideration — display inside a Consultation history entry

**Verified: structurally safe by construction.** `tenant_visits.treatment_plan` is plain `sa.Text()` — no foreign key, no structured reference, no session/schedule/lifecycle data. It **cannot** establish Treatment Plan existence or Session grouping even by accident, because it carries no relational information at all — it is prose, nothing more.

**Content-category fit: consistent with the Consultation node.** It is clinician-authored, visit-scoped free text, grouped with `chief_complaint`/`diagnosis`/`notes` — the same content category `requirements.md` §22's `FR-HIST-1` already lists for the Consultation entry (*"Visit contribution reference, Case Sheet/Prescription/Recommendation state..."*). Displaying it as part of a Consultation's expanded detail is a legitimate extension of that node, not a new concept.

**One real risk, not previously visible: label collision.** If displayed under the literal label **"Treatment Plan"** — which is what the backend's own printed-document builder currently calls it (§1) — it would sit, inside the same history surface, semantically adjacent to `FR-HIST-1`'s actual **Treatment Plan group** (a structured, session-bearing entity). A doctor scanning history could reasonably mistake free-text prose labeled "Treatment Plan" for a reference to the real Plan entity two items below it. **This did not exist as a risk before the v1.1 history-hierarchy amendment** — it only becomes a live UX hazard once both concepts can appear in the same list.

**Recommendation (not decided here — a display-time decision for whichever future task consumes it):** if surfaced, label it distinctly from "Treatment Plan" — e.g. *"Visit narrative (legacy)"* or *"Doctor's notes"* — never the bare string "Treatment Plan," to keep the two concepts visually and semantically separate in the one surface where they could now collide. **No frontend task in the current plan owns this decision** — `T-FE-C.6` (Consultation rendering) does not currently include Visit-Note-field display in its AC; if this content is wanted in history, that is new, narrow scope for a future task, not silently added to `T-FE-C.6` now.

## 4. Disposition

**Recommended: retain as legacy Visit narrative** — the default `requirements.md` already recorded. **Not migrate, not deprecate**, because:
- It is live, backend-writable content with a real business rule (completion-lock) already governing it.
- It is actively consumed today, server-side, in printed clinical documents (`document_header_builder.py`) — deprecating it would remove content from those documents, a real behavior change outside this task's (and this amendment's) scope.
- No frontend consumer exists to migrate *from* — there is nothing to move, only a decision about whether to *start* surfacing it, which is a future, separate product decision (§3).

**Naming-collision guard, updated:** four namespaces (§2), not two. `appointment_id`/`episode_id`-style FK confusion is **not possible** here (no FK exists on this column) — the risk is purely a **label/display** collision (§3), not a data-integrity one.

## 5. Effect on FR-TP-1 / T-BE-D.1

No change to `T-BE-D.1`'s scope. One addition worth carrying forward: **the target directory (`app/domain/treatment_plan/`) already contains unrelated files** (`lifecycle_status.py`, `sync_result.py`) — the new domain object must be added alongside them, not assumed to start from an empty directory.

## 6. No-New-Debt Gate — self-check

```
No Plan association was inferred from this field.          ✅ it carries no relational data at all — structurally impossible
No production behavior changed.                             ✅ read-only inspection only
No frozen requirement or design was modified.                ✅ requirements.md/design.md/tasks.md untouched this task
No unrelated file changed.                                   ✅ only this evidence file created
The naming-collision guard was strengthened, not weakened.   ✅ four namespaces documented vs. the original two
```
