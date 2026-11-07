# R7 — Appointment Purpose / Patient-Stated Concern Verification (T--1.3 / ETX-3 evidence)

**Task:** Group -1 · T--1.3 · **Status:** Complete — verification only, no implementation.
**Date:** 2026-07-18. **Repos inspected:** `novaclinicspro-api` @ `feature/r7-clinical-operating-system` (`3bb84e9`) · `novaclinicspro_rn` @ `feature/r7-clinical-operating-system` (`559ef3fd`).
**Method:** direct source inspection — ORM models, Pydantic schemas, routers, services, migrations (backend); DTOs, domain entities, forms, workspace context (frontend). **No database queried** — migrations and current model definitions are the authoritative record of schema; sufficient to answer every question this task poses without a live query.

## 1. Sources inspected

**Backend:** `app/infrastructure/db/models/tenant_appointment.py` · `tenant_visit.py` · `tenant_casesheet.py` · `org_clinical_concept.py` · `org_clinical_concept_context_mapping.py` · `app/api/v1/schemas/appointment.py` · `app/schemas/appointments.py` · `app/api/v1/schemas/finance.py` · `app/application/services/appointments_service.py` · `appointments_advanced_service_impl.py` · `appointments_advanced_mappers.py` · `visits_service.py` · `app/infrastructure/repositories/sqlalchemy_repositories.py` · `sqlalchemy_episode_repository.py` · `staff_dashboard_repository.py` · `app/core/bulk/entity_handlers.py` (bulk-import reason→appointment_type derivation) · `app/core/bulk/field_definitions.py`.
**Frontend:** `features/appointments/data/models/appointments.dtos.ts` · `features/appointments/domain/entities/appointment.entity.ts` · `features/appointments/presentation/components/AppointmentForm.tsx` · `features/episodes/presentation/context/ClinicalWorkspaceContext.tsx` · `features/episodes/presentation/hooks/useConsultationWorkspace.ts` · `features/episodes/presentation/pages/ConsultationWorkspaceScreen.tsx`.
**Confidence:** all findings below are **(a) verified** — exact file:line citations. No claim in this document is inferred from a field's name alone.

## 2. Candidate fields — inventory and semantic classification

| Candidate field | Layer/location | Written by | Persisted? | API returned? | FE retained? | Verified meaning | Safe for "Why today"? |
|---|---|---|---|---|---|---|---|
| `tenant_appointments.notes` | `TenantAppointment` ORM, `sa.Text()`, nullable | Whoever books (front desk booking form) | ✅ | ✅ (Create/Update/Response schemas, `app/api/v1/schemas/appointment.py:31,89,143`) | ✅ (`appointment.entity.ts:21`) | **Generic operational note.** UI placeholder, verbatim: *"Add any notes about this appointment"* (`AppointmentForm.tsx:404`). Zod schema: `.optional().nullable()` (`:50`). No guarantee of clinical content. | **No — ambiguous.** Could contain a patient concern, a logistics note, or nothing. Rendering it as "why today" risks presenting an operational note as a clinical statement. |
| `tenant_appointments.appointment_type` | `TenantAppointment` ORM, `sa.String(50)`, nullable | System/booking flow, values seen: `"single"`, `"series"`, `"THERAPY"`, `"consultation"`, `"therapy"` (`appointments_service.py:173`, `sqlalchemy_repositories.py:906,926,929`) | ✅ | ✅ (`appointment.py:34,155`) | ❌ **Dropped** — absent from `AppointmentEntity` (`appointment.entity.ts` — not among its fields; DTO has it at `appointments.dtos.ts:51,146`, entity does not) | **Operational scheduling classification** (single-visit vs. series, consultation vs. therapy) — used for booking-conflict logic, not a patient-facing purpose statement. | **No — wrong concept**, and separately has a mapping gap (see §9, finding E-1). |
| `tenant_appointments.reason` (`AppointmentReschedule.reason`) | Frontend-only DTO field, `appointments.dtos.ts:82,188` | Whoever reschedules | ✅ (reschedule audit trail, backend-confirmed via reschedule endpoint) | ✅ | ✅ | **Reschedule justification** ("why was this appointment moved"), unrelated to why it was booked. | **No — different concept entirely.** |
| `tenant_visits.chief_complaint` | `TenantVisit` ORM, `sa.Text()`, nullable (`tenant_visit.py:58`) | Clinician, as one of the **"Visit Note Fields"** — grouped with `diagnosis`/`treatment_plan`/`notes` (`visits_service.py:24,145`) | ✅ | via visit endpoints | not inspected (out of scope — not booking-time) | **Consultation-time clinical capture**, written during/after the visit begins. `TenantVisit` is *"usually 1:1 with a completed appointment"* (model docstring) — it does not exist until the visit is created. | **No — wrong causality.** Cannot answer "why today" before the visit exists; would require the consultation to have already started. |
| `tenant_casesheets.chief_complaint` | `TenantCasesheet` ORM (`tenant_casesheet.py:94`), also an R6 canonical clinical concept (`org_clinical_concept`/`org_clinical_concept_context_mapping`) | Clinician, extracted from case sheet `data_json` | ✅ | via casesheet endpoints | not inspected (out of scope) | Same category as above — clinician-authored, post-booking. | **No — same reason.** |
| Appointment-purpose-specific field (`purpose`, `concern`, `patient_concern`, `visit_reason`, `reason_for_visit`) | — | — | **Does not exist** | — | — | Exhaustive grep across both repos' models/schemas/DTOs: zero matches on any appointment or visit table. The handful of "purpose"/"concern" string matches found belong to unrelated domains (capability seeds, treatment-lifecycle resolver, prescription/treatment-sheet screens) — verified as false positives, not appointment fields. | n/a — nothing to render |

## 3. Answers to the 15 required questions (with evidence)

1. **Does an appointment-purpose field exist?** No dedicated field. `appointment_type` is the nearest candidate but is an operational classification, not a purpose statement (§2).
2. **Is it persisted?** `notes` and `appointment_type`: yes (`tenant_appointments` columns, confirmed in the ORM model). No dedicated purpose field to persist.
3. **Is it tenant-scoped?** Yes — `tenant_appointments` carries `tenant_id` (FK to `org_tenants`, `ondelete="CASCADE"`), like the rest of the table.
4. **Free text, enum, service reference, or other?** `notes`: free text (`sa.Text()`, unconstrained). `appointment_type`: free string (`sa.String(50)`), not an enforced enum — values are convention (`"single"`/`"series"`/`"THERAPY"`/etc.), not a DB-level constraint.
5. **Who writes it?** `notes`: whoever completes the booking form — verified as a generic front-desk/booking-flow field, not patient input. `appointment_type`: set by the booking flow/system logic (`appointments_service.py:173` sets it conditionally from other booking data).
6. **Can front desk capture it?** Yes — `AppointmentForm.tsx` is the booking form; `notes` is a plain `TextInput` on it (`:395-406`).
7. **Can the patient capture it?** No patient-facing booking/self-service surface was found in this pass; no evidence of patient-authored input into `notes` or any candidate field.
8. **Is it returned through current API responses?** `notes` and `appointment_type`: yes, both in `AppointmentResponse` (`appointment.py:143,146`... schema fields cited in §2).
9. **Does the frontend entity retain it?** `notes`: yes. `appointment_type`: **no — dropped** (§2, §9).
10. **Is it available in `WorkspaceProvider` or the consultation route context?** **No.** Exhaustive grep of `ClinicalWorkspaceContext.tsx`, `useConsultationWorkspace.ts`, and `ConsultationWorkspaceScreen.tsx` for any reference to appointment `notes` returns zero matches. The field exists in the data model but is not currently wired into the consultation/workspace flow at all.
11. **Does a distinct patient-stated concern field exist?** No — confirmed absent (§2, final row).
12. **Is chief complaint the only related clinical field?** It is the primary one; `diagnosis` and `treatment_plan` are its siblings on the same Visit Note group, all equally consultation-time, none booking-time.
13. **Is any candidate field currently dropped during DTO/entity mapping?** Yes — `appointment_type` (§2, §9, finding E-1). `notes` is not dropped.
14. **Is any candidate local-only in the frontend?** No — every candidate traced to a real backend column; none is a frontend-invented field (unlike the F-2 `allergies` precedent).
15. **Could absence be mistaken for "no concern"?** Yes, precisely the risk this task exists to prevent — if `notes` were rendered as-is as "why today" and happened to be empty, that would misleadingly read as "patient has no concern," when the true state is "nobody captured one." This is exactly why classification C (below), not B, applies.

## 4. Final classification: **C**, converging on a **D-equivalent safe fallback**

**A generic notes field exists (`tenant_appointments.notes`) but its semantics are ambiguous — not auto-approved for use as "appointment purpose" or "patient-stated concern."** No field cleanly answers either half of "why today":
- **Appointment purpose:** no purpose-specific field exists; `appointment_type` is an operational classification wrongly shaped for this use, and is separately dropped in frontend mapping.
- **Patient-stated concern:** no field of this kind exists at all; `notes` is the only candidate and is explicitly generic, optional, front-desk-authored, unwired into the workspace, and not reliably a clinical statement.

**This is not classification A** (nothing is cleanly usable as either field) **and not classification B** (nothing safely qualifies even as "purpose"). **It is not pure D either** — `notes` is not *nothing*, it is *something ambiguous* — hence **C**. But the **practical R7 disposition is identical to D's**: render **"Not recorded"** for both "why today" fields until an additive, purpose-built backend model is separately approved. Reusing `notes` as-is is explicitly rejected — it would either fabricate clinical meaning from an operational field, or (if empty) falsely suggest "no concern" when the true state is "not asked."

## 5. Effect on FR-VCC-2

FR-VCC-2 ("Why today") requires: purpose rendered when present, absent → "not recorded", **never inferred from other data**. Given classification C/D: **both fields render "Not recorded" in R7.** No inference from `notes`, `appointment_type`, `chief_complaint`, clinic type, screen, or route name is permitted — consistent with the requirement's own AC 3 and this task's explicit prohibition list. FR-VCC-2 remains implementable exactly as frozen; ETX-3 is resolved as "confirmed absent," which is one of the two outcomes the requirement's own `[VP]` marker anticipated.

## 6. Effect on FR-WFA-1

FR-WFA-1's `clinical_workflow_resolver` lists "appointment purpose" as a `WorkspaceFactsSnapshot` input (design.md §2.1, marked `[VP ETX-3]`). **Confirmed disposition: purpose is not an available input in R7.** The resolver must not condition workflow assembly on it. Per the already-frozen safe fallback (restated, not altered, by this task): assembly proceeds from **capabilities, episode state, existing records, treatment state, permissions, and billing state** only; purpose is passed through (if at all) as an explicit `NOT_RECORDED`/absent semantic state, never guessed, and its absence must never block the workspace from opening. **Purpose cannot safely influence workflow assembly now and must remain optional** — there is no verified signal to condition on.

## 7. Safe fallback behaviour (confirmed, not modified)

Frontend renders `"Not recorded"` for both "why today" sub-fields. The frontend must not infer purpose from clinic type, selected screen, existing prescription, treatment status, chief complaint, or route name — each of these was checked against the actual candidate fields above and confirmed to be a **different concept**, not a proxy for booking-time purpose. This matches the task's own prohibition list exactly; no new fallback logic was invented.

## 8. Mapping/modelling gaps found

**Finding E-1 (secondary, not blocking FR-VCC-2/FR-WFA-1):** `appointment_type` is persisted, API-returned, but **dropped during frontend entity mapping** — present in `appointments.dtos.ts` (the wire-format DTO) but absent from `appointment.entity.ts` (the domain entity actually consumed by presentation code). This is a real mapping defect, independent of the "why today" question (since `appointment_type` was never a safe purpose signal regardless). Not fixed in this task. No current R7 task owns frontend appointment-entity mapping work — recorded for awareness, not assigned.

## 9. Owning implementation task / amendment recommendation

**No R7 task is required or blocked by this finding.** FR-VCC-2 already anticipates absence (AC 2: "Absent → not recorded") and is implementable as frozen. **If the owner wants a real appointment-purpose/patient-concern capture in a future release, the correct shape** (recorded as a recommendation, not designed or implemented here, consistent with "backend-owned, model → service → repository → API → frontend render", never a frontend-local field):
- A dedicated `reason_for_visit`/`purpose` field on `TenantAppointment` (or a new booking-time value object, parallel to the existing `chief_complaint`/`diagnosis`/`treatment_plan`/`notes` Visit Note group pattern already proven on `TenantVisit`), captured at booking time, before any Visit exists.
- This is **R8-adjacent, additive, out of R7 scope** — no R7 task references it, and none should be created to build it now.
- **Finding E-1** (`appointment_type` mapping gap) has no owning task either; flagged for a future controlled task-plan amendment if a task ever needs `appointment_type` on the frontend.

## 10. No-New-Debt Gate — self-check

```
No field meaning was inferred from its name alone.        ✅ every classification traced to actual write-path/UI-label evidence
No appointment purpose was fabricated.                     ✅ result is "Not recorded", not a repurposed field
No patient concern was inferred from chief complaint.       ✅ §2/§4 explicitly reject this — different causality, different author
No frontend-only field was accepted as authoritative.       ✅ every candidate traced to a real backend column; none is FE-invented
No workflow fallback derives purpose locally.               ✅ §6/§7 — purpose is NOT_RECORDED/absent, never guessed
No frozen requirement or design was modified.               ✅ requirements.md/design.md/tasks.md/R7-OWNER-RATIFICATION.md untouched
No unrelated file changed.                                  ✅ only this evidence file created
No production behavior changed.                             ✅ read-only inspection only
```
