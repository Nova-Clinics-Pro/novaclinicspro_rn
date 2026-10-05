# R7 → R8 Handoff

**Status:** Package 3 Z7 evidence — complete 2026-10-05. This is a boundary and input record only; it authorizes no R8 implementation.

## R8 inputs

| R8 concern | Authoritative input / boundary |
|---|---|
| Measurements, adapters, and trends | `R7-LABORATORY-AND-MEASUREMENTS-DESIGN.md`: observations reuse R6 canonical concepts; provenance adapters are infrastructure; trends are backend-derived. |
| Attachments | Same design: visit-owned clinical evidence, episode-visible, capability/RBAC governed, soft deletion with audit. |
| Clinical Advice | `R7-OWNER-RATIFICATION.md`, Decision 4: the shared advice model is R8. |
| Prescription copy-forward and reconciliation | Owner Decision 5: R8 only, gated on allergy/medication modelling; never auto-issue. |
| Allergy, interaction, renal/hepatic, and advanced contraindication modelling | F-2 Option A: absent backend data remains R8; R7 must not fabricate a safety answer. |
| Dispensing fulfilment | Owner Decision 3 / `MVP-RELEASE-FREEZE.md`: a separate future domain object and lifecycle. |

## R7 boundary verification

Frontend boundary tests passed on 2026-10-05: `beforeYouActSection.test.tsx` and `whatChangedSection.test.tsx` reject R8-only safety, measurement, attachment, reconciliation, and dispensing surfaces. R7 retains backend-owned currently supported facts only.

## R8 entry condition

R8 work must begin from the documents above, retain backend clinical authority and R6 canonical-concept ownership, and separately approve its data model, permissions, lifecycle, migrations, and release evidence.
