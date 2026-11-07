# R7 — Capability-Change-Mid-Episode Verification (T--1.6 / ETX-4 evidence)

**Task:** Group -1 · T--1.6 · **Status:** Complete — verification + explicit policy recommendation, no implementation.
**Date:** 2026-07-18. **Repos inspected:** `novaclinicspro-api` @ `feature/r7-clinical-operating-system` · `novaclinicspro_rn` @ `feature/r7-clinical-operating-system`.
**Method:** direct source inspection. **No database query performed** — source evidence was conclusive.

## 1. Sources inspected

**Backend:** `app/domain/services/capability_resolver.py` (full read) · `tenant_capability.py`/`capability.py`/`org_template_capability.py`/`subscription_plan_capability.py`/`capability_dependency.py` (models) · `capability_resolution_service.py` · `capability_admin_service.py` · `capability_catalog_provider.py` · `capabilities_router.py` · `capability_multiday_entitlement_seed.py` · `app/api/v1/dependencies/capability_guard.py` · `tests/test_capability_entitlement_loss_behavior.py` · `tests/test_capability_entitlement_loss_service.py` · exhaustive grep of every R7-relevant service (`treatment_sheets_service.py`, `treatment_orders_service.py`, `prescriptions_service.py`, `casesheets_service.py`, `finance_service.py`) and every repository for any capability reference.
**Frontend:** `core/hooks/useFeatures.ts` (full read of the capability-consuming surface) · `features/appointments/presentation/pages/CreateAppointmentScreen.tsx` · `episodeWorkspaceConfig.ts` · `ClinicalWorkspaceContext.tsx`.

## 2. Capability model and resolution path

**A real, well-built, pure capability platform exists** (R5). Layering, verified: `CapabilityCatalogSnapshot` (platform-global catalog) + `TenantCapabilitySnapshot` (per-tenant entitlement + preference, pre-fetched) → **pure domain `resolve()`** (`capability_resolver.py`, no side effects, no persistence, imports nothing from infrastructure — same discipline as `treatment_lifecycle_resolver.py`) → `CapabilityState{entitled, tenant_preference, effective_available, effective_enabled, blocked_reason_code, unmet_dependencies}`. **Four deliberately separate booleans, never collapsed** — the model's own docstring: collapsing them "recreates the exact entitlement-vs-enablement ambiguity requirements.md §2 documents."

**Distinguishing catalog / entitlement / runtime availability (verified in code, not inferred):** catalog existence (`catalog.nodes.get(code)`) → entitlement (`code in tenant.entitled_codes`) → tenant preference (`tenant.preferences.get(code, False)`, independent of entitlement) → `effective_available`/`effective_enabled` (the resolved combination). **Entitlement can be lost:** `code not in tenant.entitled_codes` → `unavailable("requires_plan_upgrade", entitled=False)` — a real, exercised branch, not hypothetical.

## 3. Current enforcement points

**Capability resolution itself is called from exactly:** `capabilities_router.py` (capability status/settings surface), `capability_resolution_service.py`, `capability_admin_service.py`, `org_tenants_service.py`, `capability_localization_service.py`. **None of these is a treatment, prescription, case sheet, billing, appointment, or clinical-service router.**

## 4. Missing enforcement points

**`require_capability_available()` (`capability_guard.py`) is used by zero routers** — confirmed unwired, the same finding as T--1.2, re-verified independently here. **Zero of the five R7-relevant business services reference "capability" at all** (exhaustive grep, `treatment_sheets_service.py`/`treatment_orders_service.py`/`prescriptions_service.py`/`casesheets_service.py`/`finance_service.py` — no match in any). **No repository ever touches capability.** `tests/test_capability_entitlement_loss_service.py` includes a test *named* `test_not_wired_into_any_billing_or_subscription_call_site` — the codebase's own test suite explicitly asserts, by design, that this layer stays unwired from billing today.

**Frontend:** `allow_multiday` is consumed in **exactly one place** — `CreateAppointmentScreen.tsx`, a **booking-time gate for new appointments only**. It has zero presence in `episodeWorkspaceConfig.ts`, `ClinicalWorkspaceContext.tsx`, or any workspace/consultation/history rendering — **existing records are never re-checked against capability, anywhere, because nothing checks capability against existing records at all today.**

**Conclusion: capability enforcement in R7-relevant areas does not currently exist at any layer** — not partially, not incorrectly — genuinely absent. This reframes the task: there is no existing bad behavior to correct, but also no existing behavior to reuse for the record-preservation question specifically (only for the capability-*signal*'s own safety, §5 below).

## 5. Historical-read behaviour

**Not currently gated by capability anywhere** (§4) — therefore trivially "allowed" today, but not by design, by absence. **R7 must make this an explicit, positive guarantee** (FR-HIST/DP-15 discipline: one backend answer, not an accidental gap): historical reads (signed Prescription, existing Treatment Plan, completed Sessions, print/share) must remain allowed **by rule**, not by the current codebase simply never having built a blocker.

## 6. Active-care behaviour

**Genuinely undefined — no precedent exists, verified by absence, not assumed.** Per the task's own instruction not to decide this from intuition: I searched exhaustively (§3/§4) and found **zero code path** that distinguishes "continue an already-scheduled Session" from "create a new one" with respect to capability. This is not a partial precedent to extend — it is a real gap requiring a **new, explicit R7 policy decision** (§12), grounded in Product Discovery reasoning (patient safety / continuity of care), not in an extension of existing behavior.

## 7. New-action behaviour

**One real precedent exists, narrowly scoped:** `CreateAppointmentScreen.tsx` blocks booking a new multi-day therapy appointment when `allow_multiday` is false. This is the **only** verified "new action blocked" behavior in the entire codebase. It is booking-time only — it says nothing about creating a new Session *within an already-existing, already-authorized Treatment Plan* (a different action, per §Treatment-Specific Scenarios below).

## 8. Mutation classification

No current code distinguishes these operations by capability (none are capability-gated at all today):
- **Correction/amendment of historical clinical content** — governed today by document status/permission only (`DocumentStatus`, per earlier F-1/Decision-2 work), never by capability. **Recommendation: this must remain true in R7** — amending signed content is a document-permission question, not a capability question (§12 rule 3e).
- **Operational rescheduling** — capability-agnostic today (schedule-attribute changes per FR-TS-2 don't touch capability).
- **Adding sessions** — capability-relevant (a new Session is "new capability-dependent work"), but unenforced today.
- **Changing clinical intent** — a Plan-amendment question (Decision 2 supersession), orthogonal to capability.
- **Completing execution** — the exact "already-authorized active care" question (§6) — undefined, requires the new R7 decision.

## 9. Treatment scenarios A–E

| Scenario | Historical visibility | Existing Sessions may proceed? | New Sessions may be added? | Plan may be amended? | Doctor may stop/discontinue? | Waiting/blocking reason | Audit implication |
|---|---|---|---|---|---|---|---|
| **A** — Plan exists, no Sessions scheduled, capability removed | Plan visible | n/a (none exist) | **No** — new capability-dependent work | Clinical-intent changes only (not new sessions) | **Yes** | `capability_unavailable` | Plan status change recorded, reason attached |
| **B** — Plan exists, some completed, future scheduled, capability removed | All visible, incl. completed Sessions | **Policy decision (§12) — recommended: Yes**, already-scheduled Sessions may complete | **No** | Amend allowed (document-permission governed, not capability) | **Yes** | `capability_unavailable` on new-session attempts only | Every completion still fully audited (append-only, FR-TS-4, unaffected by capability) |
| **C** — Plan exists, review milestone reached, capability removed | Visible | Review itself is a doctor consultation action, not therapy execution — **unaffected by capability** | **No** (extension = new sessions) | Review decision (continue/stop) always allowed — a clinical judgment, never capability-blocked | **Yes**, review may recommend discontinuation | `capability_unavailable` blocks only the *extension* path | Review decision + reason recorded |
| **D** — Completed/superseded Plan, capability removed | **Always visible** — completion already happened; capability state at read-time is irrelevant to history | n/a | n/a (Plan closed) | No — closed Plans don't accept new amendments outside supersession rules | n/a | none — nothing pending | none new |
| **E** — No Plan exists, capability removed | n/a | n/a | **Blocked** — matches the one verified precedent (§7) exactly | n/a | n/a | `capability_unavailable`, `requires_plan_upgrade` (resolver's own reason code, reused) | none |

## 10. Billing/non-treatment scenario

**Billing capability disabled, existing invoice/payment history exists:** applying the same rule (§12) rather than inventing a treatment-specific exception, since the task explicitly requires proving the rule isn't treatment-only: **read** (existing invoices/payments) — allowed, unconditionally (history). **New charge/invoice creation** — blocked (new capability-dependent work), consistent with `invoice.create`'s own permission gate (T--1.2) simply also checking capability. **Payment recording against an existing invoice** — this is "continue already-authorized" in billing terms (the charge already exists; recording a payment against it is closer to completing existing work than creating new capability-dependent scope) — **recommended allowed**, mirroring scenario B's therapy-completion reasoning. **Operational closure** — per FR-BILL-2 (already frozen: billing is warning, never blocking), capability loss must not newly become a hard block either — consistent, not a new exception. **History preservation** — unconditional, same as treatment.

## 11. Current implementation classification: **C — Undefined**

Not A (no complete precedent — enforcement doesn't exist). Not B (nothing to call "partial" — zero enforcement points exist, not some-correct-some-wrong). Not D (nothing is unsafe today, because nothing acts on capability against existing records at all — the absence is safe by omission, not dangerous by commission). **The only real precedent is the capability-*signal*'s own safety** (§FR-I1/I2/I3, R5): entitlement loss is immediate on next resolution, preference is retained (auto-reactivates if entitlement returns), and no destructive delete path exists anywhere in the capability platform. **This precedent must be preserved and extended, not re-derived**, but it answers "is the capability signal safe," not "what happens to existing clinical records" — a genuinely separate question R7 must answer fresh.

## 12. Final recommended policy

**Derived from the evidence above and Product-Discovery reasoning (continuity of care, patient safety) — presented as a recommendation requiring owner confirmation for item 3b specifically, not as an already-settled fact:**

```
1. Historical records always remain visible. (Verified safe by the absence
   of any capability-gated read path today; made an explicit rule for R7,
   not left to continued absence.)
2. New capability-dependent workflows are blocked. (Matches the one
   verified precedent, CreateAppointmentScreen's allow_multiday gate,
   generalized to all new-capability-dependent actions.)
3. Existing active care is classified by operation:
   a. read — allowed (no exception).
   b. complete already-scheduled execution — RECOMMENDED allowed
      (no verified precedent either way; this is a new policy decision,
      grounded in patient-safety reasoning: stopping a therapy course
      mid-way because of a billing-plan change is a worse clinical outcome
      than letting already-authorized care finish). Requires explicit
      owner confirmation — not decided unilaterally here.
   c. add/expand (new Sessions, new Plan) — blocked (matches §7's
      verified precedent).
   d. clinically stop/discontinue — allowed (a doctor's judgment call
      must never be capability-blocked; blocking a doctor from safely
      stopping a course would be a worse outcome than any capability
      question).
   e. amend historical signed content — governed by document permission
      (Decision 2 / FR-LD-2), never by capability availability. These are
      orthogonal concerns and must stay orthogonal (§8).
4. Backend returns a capability_unavailable reason — reusing the
   resolver's own existing blocked_reason_code vocabulary
   (`requires_plan_upgrade`, etc.) rather than inventing a parallel one.
5. Frontend renders read-only/blocked/historical states from that reason
   — never infers capability loss from clinic type, absence of a field,
   or any local heuristic (AC-7, already frozen).
6. No record is deleted or hidden from history — extends FR-I3's proven
   no-destructive-delete guarantee from the capability platform itself to
   every clinical record type it might gate.
```

## 13. Workflow-resolver implications

`clinical_workflow_resolver` (`T-BE-B.1`, not yet built) must **receive backend-resolved capability availability as an input** (design.md §2.1 already lists `capabilities` in `WorkspaceFactsSnapshot` ✅) — **it must not read capability tables directly** (AC-3, domain purity — consistent with `capability_resolver.py`'s own established pattern of receiving pre-resolved snapshots, never touching a session). When a stage is unavailable due to lost capability with **existing records present**, the resolver must distinguish (per §12 rule 3): a Plan with only completed/no Sessions → **absent** stage (nothing to do); a Plan with scheduled future Sessions → **blocked** stage for *new* sessions, but the *existing* scheduled Sessions' own execution stage remains **available** (not blocked) per 3b; a Plan needing review → **available** (review/stop is never capability-gated per 3d). **Clinic type supplies labels only, never workflow presence** — already frozen (AC-7), reaffirmed, not reopened.

## 14. Frontend implications

`useFeatures.ts`'s `allow_multiday` (and any capability boolean like it) must **stop being read directly by presentation/booking screens as the sole authority** once the workflow resolver exists — `CreateAppointmentScreen.tsx`'s current direct check is **pre-R7, acceptable as-is today** (it's the one place capability is already correctly enforced), but any **new** R7 workspace/history rendering must derive blocked/available state from the backend contract (FR-WFA-1/FR-CR-1), not by re-reading `useFeatures()` locally — otherwise R7 reintroduces exactly the two-source-of-truth risk DP-15 exists to prevent.

## 15. Task-plan impact (assessed, not edited)

| Task | Impact |
|---|---|
| `T-BE-B.1` — `clinical_workflow_resolver` | **AC needs a controlled amendment** to explicitly require capability-availability as an input and to implement §12's rule 3 (read/complete/add/stop/amend classification) when a stage's capability is unavailable. Not currently specific enough. |
| `T-BE-B.2` — `clinical_workflow_service` | Minor — must resolve capability via the existing `capability_resolver`/`CapabilityResolutionService` pattern (reuse, not rebuild), feeding it into the snapshot. |
| `T-BE-D.4` — Treatment Plan service | No change to its own AC — capability-loss handling belongs to the resolver reading Plan facts, not to the Plan service itself. |
| `T-BE-E.1` — Stable Session identity | No change — session identity stability is orthogonal to capability. |
| `T-BE-E.2` — Scheduling intents | No change to scheduling mechanics; the *blocking* of new-session creation under lost capability is the resolver's job, not the scheduling intent logic's. |
| `T-BE-E.4` — Therapist execution | No change — §12 rule 3b already permits already-scheduled execution to proceed regardless of capability; this task's own scope (recording actuals) is unaffected either way. |
| `T-BE-F.1` — Billing visibility | No change to its own AC — §10's billing-capability reasoning applies to future billing-write tasks, not the read-only visibility contract already scoped. |
| `T-FE-D.1` — Render assembled workflow | No change — already correctly specified as render-only; this finding reinforces, doesn't alter, its AC. |
| `T-FE-E.2` — Treatment composition | Minor — must not independently re-check `allow_multiday`/`useFeatures()` for anything beyond what `CreateAppointmentScreen` already does; must consume the resolver's blocked/available state for in-workspace rendering. |
| `T-FE-E.3` — Therapist execution | No change — consistent with 3b, no new blocking behavior needed here. |
| `T-FE-E.4` — Billing stage | No change to its own AC. |
| `T-FE-E.6` — Role/capability composition | **Relevant, worth a note at implementation time**: this task's own name already anticipates capability composition; it should incorporate §12's rule 5 (never infer locally) directly. |
| `T-Z.3` — DP-15 proof | Should include an explicit check that capability-loss states have exactly one backend answer, same as every other clinical question. |
| `T-Z.4` — rollback validation | No change — capability loss is not a migration/rollback scenario; unrelated. |

**Controlled amendment recommended for `T-BE-B.1`'s acceptance criteria specifically** (the only task whose AC is currently insufficient for this finding); no other task requires a new atomic task or AC change. **`tasks.md` was not edited** — per instruction, this is an assessment only.

## 16. Controlled requirements/design amendment: not required for this task to complete

**FR-WFA-1 already requires capability as a resolver input** (verified — design.md §2.1 lists it in `WorkspaceFactsSnapshot`), so the *architecture* is already correct and doesn't need a new requirement. What's missing is **AC-level precision** on `T-BE-B.1` (§15) — a task-plan-level fix, not a requirements-level one. **No FR-HIST-style new requirement is proposed here.** If the owner wants §12 rule 3b (complete-in-progress-care) elevated to a frozen, named requirement rather than an implementation-time AC, that would be a future controlled amendment — flagged as optional, not performed.

## 17. No-New-Debt Gate — self-check

```
No capability was inferred from clinic type.              ✅ §13/§14 explicitly reaffirm capability-gated, never clinic-type-gated
No permission was substituted for capability.              ✅ §2's four-boolean model keeps these distinct throughout
No historical clinical record was proposed for hiding/deletion. ✅ §12 rule 1/6 — always visible, never deleted
No active-care policy was guessed without evidence.        ✅ §6/§12 rule 3b explicitly marked as a NEW decision requiring owner confirmation, not asserted as verified fact
No frontend-derived capability decision was accepted.       ✅ §14 — CreateAppointmentScreen's existing direct check is pre-R7 and not extended; new R7 surfaces must consume the backend contract
No frozen requirement/design/task plan changed.            ✅ confirmed — only this evidence file created
No unrelated file changed.                                  ✅ same
No production code or data changed.                         ✅ read-only source inspection only, no DB query needed
```

## Summary matrix

| Scenario/action | Capability available | Capability unavailable | Historical records visible? | Write allowed? | Backend semantic state | Frontend treatment |
|---|---|---|---|---|---|---|
| Read existing Plan/Session/Prescription/Invoice | n/a | n/a | **Yes, always** | n/a | `available` (read) | render normally |
| Create new Plan/Recommendation | allowed | **blocked** | n/a | No | `blocked` / `capability_unavailable` | disabled CTA + reason |
| Add new Session to existing Plan | allowed | **blocked** | n/a | No | `blocked` / `capability_unavailable` | disabled CTA + reason |
| Complete an already-scheduled Session (§12 rule 3b) | allowed | **RECOMMENDED allowed** *(owner confirmation needed)* | Yes | Yes (execution recording) | `available` (execution) | normal therapist execution UI |
| Doctor stop/discontinue Plan | allowed | **allowed** | Yes | Yes (status change) | `available` (clinical judgment, never gated) | normal review/stop UI |
| Amend signed document content | governed by document permission, not capability | governed by document permission, not capability | Yes | per document-permission rule (Decision 2) | `available`/`blocked` per permission, **not** per capability | amendment UI unaffected by capability state |
| New invoice/charge | allowed | **blocked** | n/a | No | `blocked` / `capability_unavailable` | disabled CTA + reason |
| Record payment on existing invoice | allowed | **RECOMMENDED allowed** (§10, mirrors 3b) | Yes | Yes | `available` | normal payment UI |
