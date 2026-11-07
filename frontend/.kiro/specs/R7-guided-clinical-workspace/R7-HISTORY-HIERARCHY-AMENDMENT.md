# R7 — Controlled Requirement Amendment: Consultation & Therapy History Hierarchy

**Status:** **PROPOSED — not approved, not incorporated into requirements.md/design.md/tasks.md.** Documentation only.
**Date:** 2026-07-18. **Repos inspected:** `novaclinicspro-api` @ `feature/r7-clinical-operating-system` (`3bb84e9`) · `novaclinicspro_rn` @ `feature/r7-clinical-operating-system` (`5a497653`).
**Trigger:** a verified product gap identified after R7 requirements freeze. This document proposes an amendment; it does not enact one. No frozen document is modified.

---

## 1. Verified current behaviour

**The reported problem is real, but its exact mechanism differs from the initial framing in one important way — worth stating precisely, per Engineering Truth discipline.**

There is **no separate "doctor-dashboard history" surface**. `features/doctorDashboard/` contains no history/timeline file; the only implementation is `ClinicalTimeline.tsx` (rendering) + `useClinicalTimelineData.ts` (data assembly), reached from the Episode Workspace. "Doctor-dashboard history" and "Episode Workspace timeline" are the same code — one finding, not two.

**The timeline is 100% frontend-assembled — already a known, self-documented architectural choice from an earlier phase**, not an oversight this task discovers fresh. `useClinicalTimelineData.ts`'s own docstring (R3B · T-C.1, ADR-R3B-02) states it is *"an adapter... aggregation/normalization ONLY"* that merges five independently-queried artifact types into one client-sorted list. **No backend endpoint assembles episode/patient history at all** — confirmed by exhaustive search of `episodes_router.py`/`visits_router.py` for any `history`/`timeline` route: none exists. This file is already on **ED-ARCH-001**'s remediation list (`T-0.6`, "1 violation import" — a raw `axiosClient`/datasource import) — but T-0.6's scope is the *transport-layer* violation only, not the *grouping/classification logic* this amendment concerns.

**Precise mechanism, verified line-by-line (`useClinicalTimelineData.ts`):**
- The `'visit'` timeline item type is **not** backed by `TenantVisit` (the separate ORM model investigated in T--1.3) — it is backed by `useAppointmentsListQuery`, i.e. **Appointments**. The naming (`'visit'`) is a pre-existing conflation between the UI concept "Visit" and the backend entity `TenantAppointment`.
- **Every appointment for the episode — consultation or therapy — becomes one flat `'visit'` item**, sorted purely by `appointment_start`. No branch anywhere checks `appointment_type` (which, per T--1.3, does carry `"THERAPY"`/`"therapy"`/`"consultation"` values) to differentiate them. **This confirms the reported problem: a multi-session therapy course renders as many indistinguishable flat items, identical in shape to a doctor consultation.**
- **A partial, pre-existing grouping concept already exists** for treatment sessions — but not where expected. The hook already collapses each `tenant_treatment_sheet` into **one** `'treatment_recommendation'` item with a computed `"${completedSessionCount}/${sessionCount} therapy sessions"` subtitle, rather than listing each `treatment_sheet_row` individually. This is real prior-phase work in the right direction — but: **(a)** the aggregate is computed client-side (`sheet.rows?.filter(...)`, a frontend clinical-fact computation — see §Impact, FR-COS-2), **(b)** the formula is verifiably wrong: `completedSessionCount` counts rows with a `session_date` set (i.e., *scheduled*), not rows with `status`/`completed_at` indicating actual completion — so today's aggregate already misreports progress, and **(c)** the underlying therapy *appointments* still separately appear as flat `'visit'` items **in addition to** being tallied inside the treatment sheet's count — a double-representation defect, not merely a missing feature.
- `ClinicalTimeline.tsx` already consumes the central theme correctly (`useClinicTheme()`, `colors.surface/border/text.*`, `typography.h6/body2/subtitle2/caption`) and assigns one `Ionicons` icon per item type — so **no new theme violation exists**; this is a structural/grouping problem, not a styling one. Only 5 item types exist today, none distinguishing consultation from therapy.

**No `TenantVisit` record is ever created from treatment execution** — confirmed: `visits_service.create_visit` is called from exactly one place, `visits_router.py:41` (the visit-outcome recording flow, `appointment.update`-gated per T--1.2). `treatment_sheet_row`/`tenant_treatment_sessions` are structurally disconnected from `TenantVisit` entirely — a therapy session is never, and has never been, a `TenantVisit` row. The "every session treated as an ordinary Visit" framing is therefore accurate **at the UI-concept level** (the flat item labeled "Visit") but not at the **data-model level** (no schema conflation exists to fix — the conflation is presentation-layer only).

## 2. Product problem (confirmed)

With the above corrected mechanism: a doctor cannot distinguish, at a glance, "I saw this patient" from "the patient attended a scheduled therapy appointment," cannot see a multi-session course as one course, and the one partial grouping that exists (`treatment_recommendation`) reports a **verifiably incorrect** completion count while the therapy appointments it's meant to summarize still leak through separately. The upcoming `tenant_treatment_plan` entity (FR-TP-1) has no representation in history at all today — there is nothing to represent, since it doesn't exist yet.

## 3. Domain distinctions (verified vocabulary, not invented)

| Proposed concept | Nearest verified existing vocabulary | Verdict |
|---|---|---|
| `DOCTOR_CONSULTATION` | `appointment_type` values `"consultation"` (`sqlalchemy_repositories.py:929`); doctor-only actions (`episode.close`, `casesheet.sign`) attach to this encounter shape | No enum exists; would be new, additive classification — smallest addition: reuse `appointment_type`'s existing string convention, do not invent a parallel field |
| `THERAPY_SESSION` | `appointment_type` value `"THERAPY"`/`"therapy"`; `treatment_sheet_row` (session identity, execution facts) | Same — classification signal exists in `appointment_type`, execution detail already modeled on `treatment_sheet_row` |
| `TREATMENT_REVIEW` | `treatment_lifecycle_resolver`'s `NEEDS_CLINICAL_REVIEW` / `UNDER_CLINICAL_REVIEW` statuses (`app/domain/services/treatment_lifecycle_resolver.py:51-52`) | **Closest existing anchor** — the treatment lifecycle already has a distinct clinical-review concept, separate from execution (`IN_THERAPY`) and separate from initial consultation (`RECOMMENDED`) |

**No enum spelling is invented in this document**, per instruction — the table above cites what exists; final spelling is an implementation-time decision, same posture as `T-BE-D.1`'s Treatment Plan status enum ([VP], deferred).

## 4. Proposed backend hierarchy (conceptual — not an implementation design)

```
history_items:
  - item_type: consultation
    visit_id / appointment_id: ...
    clinician, occurred_at, summary
  - item_type: treatment_plan
    treatment_plan_id, status, summary, session_counts{...}
    sessions: [{session_id, scheduled_at, execution_outcome, non_completion_reason}]
  - item_type: legacy_treatment_sessions   ← see §8
    reason: "plan_association_unavailable"
    sessions: [...]
```
Exact API shape is an implementation-time decision (follows established conventions, per instruction) — this is the conceptual contract only.

## 5. Consultation presentation

Consultations remain **top-level**, unchanged from today's flat-list behavior for this item type. Additive fields beyond today's `title`/`subtitle`/`date`: clinician, reason (or `Not recorded`, per T--1.3's finding — no fabrication), Visit contribution reference, Case Sheet/Prescription/Recommendation state, follow-up/Episode decision. Visual distinction from therapy: icon + semantic label (already the established `ITEM_ICON` pattern) — **never colour alone**, consistent with `FR-MOB-1` AC5 (already frozen, not reopened by this amendment).

## 6. Treatment Plan grouping

Collapsed row: Plan identity, treatment summary, status, start date, intended/authorized/completed/scheduled/missed/cancelled session counts, next scheduled session, review milestone, responsible clinician — **all backend-computed**, reusing `treatment_lifecycle_resolver` for lifecycle-derived facts rather than re-deriving them (the same "one answer" discipline `design.md` §2.1 already established for the Clinical Workspace aggregate). Collapse/expand is frontend UI state only — the grouping itself is not.

## 7. Expanded session presentation

Per session: stable Session identity, scheduled date/time, therapist, operational status, execution outcome, structured non-completion reason (aligning with the already-frozen `FR-TS-5` "Missed" decomposition — not reopened here), therapies/instructions/materials, actual duration, patient response, review status. These are exactly `FR-TS-1`/`FR-TS-4`'s fields — this amendment is a **consumer** of those requirements, not a redefinition of them.

## 8. Legacy-session handling

**Verified: legacy sessions are not orphaned — every `treatment_sheet_row` has a non-null `treatment_sheet_id` (FK, `NOT NULL`)** — a real, deterministic anchor exists today. The open question is **cardinality**, not existence: will each historical Treatment Sheet map 1:1 onto a future `tenant_treatment_plan` row, or can one conceptual course span multiple Treatment Sheets?

**Reasoned, not verified:** `treatment_lifecycle_resolver`'s `EXTEND`/`UPDATE_FUTURE_ROWS`/`CONTINUE_UNCHANGED` actions (lines 71-73) suggest a course is *extended in place* rather than *recreated as a new sheet* — weak evidence toward a 1:1 mapping being common. **This is not confirmed against live data** and must not be assumed. **A data audit is required** before any backfill: count treatment sheets per episode/recommendation across real tenants; where cardinality is 1:1, migrate cleanly; where ambiguous, classify under `LEGACY_TREATMENT_SESSIONS` (or the smallest-additive equivalent code) rather than guess a grouping from dates, therapy name, patient, therapist, or Episode proximity — exactly as instructed.

## 9. Mobile behaviour

Collapsible Plan groups are new mobile surface not previously scoped by `FR-MOB-1`. Must inherit, not violate, its existing constraints: sticky next action, ≥44pt targets, no dot-only status, icon+text always. Collapse affordance itself needs a touch target meeting the same minimum. No new mobile principle is proposed — this is an application of `FR-MOB-1`/`FR-MOB-2` to a new component, not an amendment to them.

## 10. Central-theme requirements

No amendment needed to the theme system itself — `ClinicalTimeline.tsx` already correctly consumes `useClinicTheme()`. The Plan-group component and consultation/therapy visual distinction must follow the same pattern (semantic tokens, no local hex/px, icon+text status) already verified compliant in this file during T--1.1's theme review.

## 11. Proposed requirement(s)

### FR-HIST-1 — Clinical History Separates Consultations from Therapy Encounters

**Rationale.** Verified: the current timeline flattens all appointment types into one undifferentiated list, computed client-side, with a verifiably incorrect session-completion count. **Backend.** owns encounter classification, Plan-to-session association, session aggregates, Plan lifecycle summary. **Frontend.** collapse/expand, navigation, accessibility, theme-driven rendering only. **Principles.** P1, P2, P3 (DP-15 — one authoritative hierarchy, not a frontend-reconstructed one), P9.

**Acceptance criteria** (verbatim from the instruction, each traced to the verified evidence above):
1. Doctor consultations render as top-level clinical encounters.
2. Therapy sessions do not render as independent top-level consultation Visits.
3. Therapy sessions are grouped beneath their authoritative Treatment Plan.
4. Each Treatment Plan group is collapsible.
5. The collapsed group shows backend-provided session aggregates.
6. Expanded sessions retain their individual identity and execution details.
7. Treatment Review consultations remain distinguishable from therapy sessions.
8. Multiple Treatment Plans remain separate.
9. Completed and superseded Plans remain visible.
10. Sessions without reliable Plan association are explicitly classified as legacy/unassociated.
11. The frontend performs no Plan grouping or encounter classification.
12. The backend aggregate is the sole authority for the hierarchy.
13. Status is not represented through colour alone.
14. All styling uses centralized theme tokens and reusable UI primitives.
15. Mobile presentation remains understandable and does not flatten the hierarchy.

### FR-HIST-2 (proposed, second requirement) — Backend History Aggregate

**Assessment: yes, a second requirement is warranted**, separating the *product-facing hierarchy rule* (FR-HIST-1) from the *backend contract that supplies it* (FR-HIST-2) — the same split already used elsewhere in this spec set (e.g. FR-WFA-1 vs. FR-REC-1). FR-HIST-2 would specify: the history read model as an extension of (or sibling to) the Clinical Workspace aggregate (`T-BE-A.1`'s `WorkspaceFactsSnapshot` machinery — not a parallel, disconnected contract), reuse of `treatment_lifecycle_resolver` for lifecycle-derived facts, and the `LEGACY_TREATMENT_SESSIONS` fallback semantics from §8. **Not drafted in full here** — proposing its existence, not its AC, pending owner decision on whether this amendment enters R7 at all (§17).

## 12. (see §11 — acceptance criteria included above)

## 13. Requirements impact

| Requirement | Impact |
|---|---|
| `FR-VCC-3` | **Reinforced, not conflicted.** Two of its eight signals ("active treatment sessions," "completed session count") should be computed by the *same* backend aggregate this amendment proposes — today they'd otherwise risk a second, inconsistent computation. |
| `FR-CS-5` | **Consistent.** Case Sheet contributions naturally host under the "Doctor Consultation" node in §5's hierarchy — no conflict, FR-CS-5's own AC unchanged. |
| `FR-TP-1` | **Hard dependency.** The "Treatment Plan" grouping node has no real data to group by until `T-BE-D.1`–`D.4` exist. This amendment's Plan-grouping half is sequenced *after* Treatment Plan, not parallel to it. |
| `FR-TS-1` | **Consumed, not changed.** Expanded-session fields are exactly FR-TS-1's stable-identity guarantees. |
| `FR-TS-4` | **Consumed, not changed.** Expanded-session execution facts map directly onto FR-TS-4's fields. |
| `FR-MOB-1` | **Extended, not violated** — new mobile surface (collapsible groups) must inherit its existing constraints (§9). |
| `FR-COS-2` | **This amendment is itself an application of FR-COS-2 to a surface it didn't originally name.** New finding, worth recording precisely: `useClinicalTimelineData`'s existing `completedSessionCount` computation is **already** a live instance of frontend-derived clinical aggregation — the same anti-pattern class as `ED-ARCH-004`/`006`, on a file not previously catalogued for this specific defect (only for its transport-layer import). Recorded here as evidence; **not** filed as a new `ED-ARCH` number in this task — that decision belongs to whoever incorporates this amendment. |

## 14. Design impact

The backend hierarchy contract should be designed as an **extension of `T-BE-A.1`'s Clinical Workspace aggregate** (design.md §2.1), reusing its `WorkspaceFactsSnapshot`/repository-composition pattern and its reuse of `treatment_lifecycle_resolver`, rather than as a disconnected new read model — consistent with design.md's own "why one aggregate read, not enriched per-entity responses" rejection of stitched, multi-source frontend assembly (§2.1, "Rejected — stitching is frontend derivation... reintroduces ED-ARCH-006"). Building a *second* aggregate for history would repeat exactly the mistake that section already rejected once.

## 15. Task-plan impact (identified, not written into `tasks.md`)

Likely new/extended tasks, **not created or renumbered here**:
- Backend hierarchical history contract — new task, sibling/extension of `T-BE-A.1`/`T-BE-A.2`.
- Treatment Plan session-summary query — depends on `T-BE-D.1`–`D.4` completing first; cannot start earlier.
- Legacy session classification (`LEGACY_TREATMENT_SESSIONS`) — depends on the data audit (§8/§16).
- Frontend collapsible Plan group — extends/replaces `ClinicalTimeline`/`useClinicalTimelineData`; **must complete `T-0.6`'s ED-ARCH-001 remediation first**, since it touches the same file.
- Consultation/therapy visual distinction — small, theme already compliant (§10).
- Mobile behaviour for collapsible groups — extends `T-FE-G.1`.
- Tests: an architecture test extending the existing "no FE clinical derivation" pattern (`T-0.8`/`T-0.9`'s precedent) to assert the history hook performs zero aggregation; backend unit tests for hierarchy assembly (no-DB, per the resolver-pattern precedent); a data-audit script/report for §8's cardinality question.

## 16. Migration/data-audit impact

**One data audit required, not a migration:** count Treatment Sheets per episode/recommendation across real tenant data to determine 1:1-vs-ambiguous cardinality before any historical backfill into `tenant_treatment_plan` is designed (§8). No schema change is proposed by this amendment itself — it consumes `tenant_treatment_plan` (already scoped as an additive migration under `T-BE-D.2`) and adds no new columns/tables of its own beyond the (also undesigned-here) history read model, which is additive by construction (a query, not a table).

## 17. Blocking/non-blocking assessment

**Does not block T--1.4 or any remaining Group -1 task.** T--1.4/T--1.5/T--1.6/T--1.7 concern capability-change-mid-episode behavior, the null-`episode_id` audit, and the environment gate — none depends on history-hierarchy resolution. Group -1 may continue independently.

**Does block, structurally, the Plan-grouping half of any future history-hierarchy implementation** until `FR-TP-1`/`T-BE-D` completes — this is a sequencing fact, not a Group -1 blocker.

**The larger open question is scope, not sequencing:** `FR-VCC-3` (already frozen) deliberately narrowed R7 to eight specific "what changed" signals, citing "D8 limits R7 to currently available data." This amendment's full hierarchical-history redesign is materially larger than that narrow scope — closer in shape to a new COS surface than a correction to an existing one. Whether it belongs in R7 at all, or should defer to R8 (consistent with this engagement's established R7/R8 split discipline), is the owner's call, not mine to decide.

## 18. Recommendation

**Two defensible paths, not a single answer I've chosen unilaterally:**

- **(a) Conditional approval into R7** — incorporate `FR-HIST-1`/`FR-HIST-2`, explicitly sequenced after `T-BE-D` (Treatment Plan) completes, with the consultation/therapy visual split (the *non*-Plan-dependent half) shippable earlier as its own additive slice. This is coherent with R7's existing additive/reversible posture and closes a real, verified gap before the new Treatment Plan model ships with no history representation at all.
- **(b) Defer to R8** — the gap is real but not urgent (nothing in Group -1 through Group F depends on it), and R7 is already sized Large; adding a new backend read model plus a data audit plus new mobile surface is genuine additional scope, not a bug fix.

**My analysis favors (a) narrowly** — the Plan-grouping problem gets *harder*, not easier, to retrofit once the flat-history pattern ships broadly across R7's task plan (every consumer of the eventual history surface would need a second migration) — but this is a scope decision for the owner, consistent with how every other R7/R8 boundary call in this engagement (F-2, Treatment-Plan-vs-projection, the Clinical Advice unification) was made by explicit ratification, not by me deciding on their behalf.
