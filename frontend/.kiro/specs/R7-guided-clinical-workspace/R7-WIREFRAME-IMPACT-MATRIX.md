# R7 — Wireframe → Code Mapping & Impact Matrix

> ## ⚠ REVISED BY DESIGN REVIEW — read [R7-DESIGN-REVIEW-GAPS.md](R7-DESIGN-REVIEW-GAPS.md) first
> This matrix mapped **only the form-stepper wireframes**. It is missing rows for every COS region added by the review:
> **Visit Command Center** (W0), **"what changed" delta panel**, **patient-safety/alerts surfacing**, **workflow-assembly engine**, **billing stage** (W-billing), **append-only visit notes** (E-2), **document amendment/supersession** (A-3), **plan/session separation** (A-9), **measurements/trends**, **attachments**, **clinic-type variants** (W0-c), **mobile Command Center** (W0-m).
> Two existing rows are also **wrong**: the prescription row cited a fictional `ISSUED/DISPENSED` lifecycle (E-1), and the case-sheet row assumed a per-visit document (E-2).
> **Sizing:** with these regions, the aggregate is **Large**, not Medium — see the revised [Feasibility](R7-FEASIBILITY-AND-IMPACT.md).
> **This matrix must be re-cut after the eight owner decisions (review Part 5).**

**Status:** Discovery — not approved, not implemented.
Size classes: **S**mall · **M**edium · **L**arge · **VL**arge (by code surface, dependency breadth, migration complexity, risk — no calendar estimates).
Disposition vocabulary: Reuse-unchanged · Reuse-by-composition · Refactor-and-reuse · Replace · Create-new · Wrap-for-compat · Redirect · Deprecate-after-migration · Remove-after-zero-usage.

## Wireframe-region → code map

| Wireframe region | Existing route/screen | Existing component | Proposed action | New component? | App/use-case impact | Repo impact | API dependency | Permission dependency |
|---|---|---|---|---|---|---|---|---|
| Context header (W1–4) | `episodes/[id]/workspace` | `PatientSummarySection`, `ActiveCaseBanner`, `WorkspaceProvider` | Reuse-by-composition | No | consumes context | none | episode/visit read | role config |
| Workflow pills (W1) ✏ | — | `SectionProgress` (**UI state only** — never clinical truth, DP-15) | Create-new (`WorkflowPills`) — **render only** | **Yes** | **none — workflow assembly is BACKEND-owned** (Decision 9) | none | workflow-intelligence contract | backend-supplied |
| Next-action bar (W1) ✏ | — | — | Create-new (`NextActionBar`) — **render only** | **Yes** | **none — recommendation is BACKEND-owned** (`clinical_workflow_service` + pure `clinical_workflow_resolver`, Decision 9) | none | **workflow-intelligence contract** (`recommended_action`/`reason`/`blocking_factors`/`waiting_role`/`completion_readiness`) | per-step perms **from backend `blocking_factors`/`waiting_role`**, not a frontend map |
| Case sheet body (W5–7) | `CaseSheetModule` + `casesheets/*/new,edit` | `CaseSheetModule` | Reuse-by-composition; standalone → Redirect | No | reuse module | casesheet repo (reuse) | casesheets router | `casesheet.write` |
| Prescription body (W8–9) | `PrescriptionModule` + `prescriptions/*/new,edit` | `PrescriptionModule` | **Refactor-and-reuse** (ED-ARCH-001: remove `axiosClient.get`) then compose; standalone → Redirect | No | reuse after remediation | prescription repo (reuse) | prescriptions router | `prescription.write` |
| Recommendation (W10–11) | `TreatmentRecommendationModule` | same | Reuse-by-composition | No | reuse | treatment repo (reuse) | treatment_orders router | `treatment.recommend` |
| Scheduling/plan (W12) | `treatment-sheets/[id]/schedule`, `TreatmentPlansSection` | same | Reuse-by-composition | No | reuse | treatment_sheet repo (reuse) | treatment_sheets router | `treatment.schedule` |
| Session/actuals (W13–16) | `treatment-sessions/[id]`, `TreatmentSessionCompleteModal` | same *(structural)* | Reuse-by-composition (confirm in Group 0) | No | reuse | session repo (reuse) | treatment_sessions router | `session.execute` |
| History panel (W23) ✏ *(v1.1 amendment, FR-HIST-1/2)* | `ClinicalTimeline` | `useClinicalTimelineData` | **Refactor-and-reuse** — stops assembling 5 flat queries + local session-count aggregation (ED-ARCH-007), consumes backend `history_items[]` | No (existing file, corrected — not a new component) | **removes** local classification/aggregation logic (`T-FE-C.5`); adds collapsible Plan-group rendering (`T-FE-C.6/C.7`) | **Yes — new backend read** (`T-BE-A.3/A.4/A.5`, extends Clinical Workspace aggregate; ⚠ **was previously marked "No" backend impact — corrected here**) | clinical_workspace router (extended) | view perm (unchanged; classification is backend-owned, not a new permission) |
| Multiple plans (W24) | `TreatmentPlansSection` | same | Reuse-unchanged | No | — | reuse | treatment_sheets router | view/schedule |
| Disposition (W17) | `CompleteConsultationScreen` | same | Reuse-by-composition as `step=complete` | No | reuse | visit/episode repo | visits/episodes router | `visit.outcome`, `episode.close` |
| Legacy redirect (W25) | consultation/complete/start routes | — | Wrap-for-compat + Redirect | thin adapter | route param mapping | none | none | none |
| Blocked/permission/stale/fail (W18–21,26,30) | — | `SectionSaveStatus` | Create-new (guidance states) in stepper/next-action | within new comps | derivation only | none | aggregate read | per-step perms |

## Per-wireframe impact (frontend / backend / product) with size

| Wireframe(s) | Frontend impact | Backend impact | Product/workflow impact | Size | Reason |
|---|---|---|---|---|---|
| W1–4 shell+stepper+header+next-action | new shell + 2 components + 1 use-case; query key for aggregate; nav within workspace; localization keys; a11y (linear focus, step roles); responsive (W22) | **new additive read aggregate** (router→service→repos+resolver); no schema | resolves G-1/G-2; introduces "next action" decision; risk of third surface if not reusing route | **M** (FE) / **S–M** (BE) | composition over existing primitives; one new endpoint |
| W5–7 case sheet | reuse module; standalone screen → redirect; converge dual-impl | reuse casesheets router (DRAFT→FINAL) | resolves G-3/G-5; dup prevention already partial | **M** | dual-impl convergence + redirect |
| W8–9 prescription | **remediate `axiosClient.get` (ED-ARCH-001)** then reuse; standalone → redirect | reuse prescriptions router | resolves G-3 + G-6 (blocking) | **M** | layer remediation is a blocking prerequisite |
| W10–16 treatment path | reuse rec/schedule/session components; add handoff signal | reuse treatment routers; **additively attach lifecycle_status** where consumed | resolves G-4; handoff visibility | **M** (FE) / **S** (BE) | reuse + additive response fields |
| W17 disposition | reuse complete screen as step | reuse visits/episodes | closes lifecycle loop | **S–M** | reuse |
| W18–21,26,30 states | new derivation in stepper/next-action | none (reads aggregate) | prevents stranding; clarifies blocks | **S–M** | pure derivation |
| W25 redirects | route adapters, flag-gated | none | legacy convergence | **M** | staged migration |
| W27–28 handoffs | cross-role next-action rendering | additive status attach | role continuity | **S–M** | reuse context key |
| W22 mobile / W23 long history / W24 multi-plan | responsive stepper; virtualized timeline; per-plan chips | none | usability | **S–M** | existing components |

## Architecture-risk & rollback per cluster

| Cluster | Architecture risk | Rollback |
|---|---|---|
| Shell + stepper + aggregate | Low–Med (must not become 3rd surface; aggregate must go router→service→repo) | flag off → today's workspaces; endpoint additive, drop with no data effect |
| Module remediation (ED-ARCH-001) | Med (touches live authoring modules) | per-file; behavior-preserving; covered by existing module tests |
| Redirects/legacy | Med (deep-link correctness) | flag off → original routes intact (never deleted in R7) |
| Backend response enrichment | Low (additive) | remove fields; consumers tolerate absence (they re-derive today) |

## Dependencies

- Group C-FE (stepper/next-action) depends on Group C-BE (aggregate) for non-duplicated derivation; can proceed on stitched data as interim.
- All FE module composition depends on Group 0 ED-ARCH-001 remediation of that module.
- Legacy redirects (Group G) depend on the workspace shell existing and passing role/deep-link validation.
