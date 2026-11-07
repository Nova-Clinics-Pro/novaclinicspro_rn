# R8 Discovery — Current Role Journeys (as implemented today)

> **Status:** Discovery only — these are the journeys **as they exist on `dev` today** (frontend `b1534e6e`, backend `9dba7d1`), not future journeys. No redesign is proposed.
> Evidence: route files under `app/`, feature hooks/repositories, backend routers/services, the governing phase specs, and the four production failures observed 2026-07-14.
> Companion: [CURRENT-STATE-GAP-ANALYSIS.md](CURRENT-STATE-GAP-ANALYSIS.md) (roles, subsystems, screen classification, authority map).

Format per journey: **Flow** (concrete, route/API-level) · **Owner** · **Responsibility & handoff** · **Pain points** · **Confusion** · **Strengths**.

---

## J1. New Patient

**Flow:** Receptionist/Admin (both on `/clinic-admin`) → Clients (`/clinic-admin/clients`) → create client (client form; RBAC: `client.create` — Receptionist has it) → book appointment (`/clinic-admin/appointments/create`, `CreateAppointmentScreen`; therapy clinics get multiday/gender-matching options via `useFeatures` clinic-type gate) → appointment appears on the doctor's day list (`GET /clinic/{t}/staff/me/dashboard/doctor`).

**Owner:** Front desk (Receptionist RBAC template) — but executed inside the admin namespace.
**Handoff:** to Doctor via the dashboard day list.
**Pain points:** no front-desk surface — the receptionist performs this inside an admin console with revenue/inventory chrome; new-patient + book is two separate admin flows rather than one desk task.
**Confusion:** which of the ~10 admin quick actions is "register a walk-in."
**Strengths:** client and appointment features are mature; RBAC scoping is correct underneath; appointment rules/operating hours enforced backend-side.

## J2. Returning Patient

**Flow:** search in `/clinic-admin/clients` → client detail (`clients/[clientId]`) → book from client context or from appointments create → optional episode continuity happens **later, at consultation time**, via Link-Episode (`appointments/[id]/link-episode`), not at booking.

**Owner:** Front desk; episode linkage deferred to Doctor.
**Pain points:** returning-ness carries no weight at booking (no "continue existing episode?" prompt at the desk); the linkage lands on the doctor mid-consult instead.
**Confusion:** client page shows admin actions (edit demographics, billing) alongside clinical history entry points — the same page Failure D mis-routes doctors into.
**Strengths:** client detail aggregates documents (casesheets/prescriptions/treatment-sheets per client) — the raw material for a real history view exists.

## J3. Doctor Consultation (the core journey)

**Flow (today, 4–5 hops):** `/doctor` day list → tap appointment → `/clinic-admin/appointments/[id]` (Appointment Detail) → "Start Consultation" → `start-consultation` route → **episode decision forced**: Link (`link-episode`) or Create (`create-episode`) → `/clinic-admin/episodes/[episodeId]/consultation?appointmentId=…&clientId=…` → `ConsultationWorkspaceScreen` accordion: PatientSummary · CaseSheetModule (autosave; only `chiefComplaint` expanded by default) · PrescriptionModule · TreatmentRecommendationModule · ClinicalServicesModule (+AyurvedicAssessment for ayurveda) → "Save & Submit" (flushes casesheet autosave via ref) → `/clinic-admin/episodes/[id]/complete-consultation` → status transition `DRAFT → FINAL` (`PATCH /clinic/{t}/casesheets/{id}/status`) → back to dashboard.

**Owner:** Doctor end-to-end; Episode ownership (R2/R3B: episodes anchor visits); Case Sheet ownership enforced backend-side (single canonical editor per R4 retirement plan).
**Handoff:** none unless a treatment recommendation is sent (J4).
**Pain points (live):** Failure B — Complete Consultation is offered when the casesheet is already FINAL and the backend (correctly) rejects `FINAL → FINAL`; stale screen reuse after save/navigation (prior audit, still current); completion has no completeness signals (can complete with nothing documented); interrupted consults have no resume affordance.
**Confusion:** the episode Link/Create decision precedes clinical work with unexplained stakes; four document-named modules with no indication of which are required, complete, or optional; "Clinical Services" is a raw data concept (its feature module has no presentation layer) sitting beside real clinical tasks; two additional doors to author casesheets/prescriptions exist from Appointment Detail (R4 classified them as redirects — verify execution).
**Strengths:** the module internals are excellent — canonical single editors, autosave with flush-before-navigate, specialty extension slot proven (Ayurveda); `useConsultationWorkspace` cleanly aggregates episode/visit context; backend state machine cannot be bypassed by the UI.

## J4. Treatment Recommendation (Doctor → Admin handoff)

**Flow:** inside the accordion, `TreatmentRecommendationModule` → requires a casesheet to exist (`ensureCasesheetExists()` ref-bridge creates one if absent — a real backend constraint surfaced as module coupling) → `POST /treatment-sheets/clinic/{t}/treatment-recommendations` creates a Treatment Sheet with `is_order=false` (a "recommendation") → "Send to Admin for Scheduling" → `POST /treatment-sheets/{sheetId}/send-to-scheduling` flips it to `is_order=true, state=ORDERED, scheduling_status=PENDING_SCHEDULING` → appears in the admin worklist (J5). Lifecycle: `RECOMMENDED → NEEDS_SCHEDULING` (R4 resolver).

**Owner:** Doctor recommends; Admin decides (R4's explicit ownership split — Scheduling Decision belongs to Admin).
**Pain points (live):** Failure C — the send flow first re-attempts casesheet finalization (hitting FINAL→FINAL if J3 already completed), then the recommendation POST 500s (root cause with the paused regression audit); duplicate-submission protection absent client-side.
**Confusion:** recommendation vs order vs sheet is one entity with an `is_order` flag wearing three names; doctors can't see the admin's subsequent decision in-flow (denial reasons live admin-side).
**Strengths:** the two-stage split (recommend → schedule) is clinically correct and backend-enforced; denial with structured reasons and Scheduling-On-Hold (with auto-expiry sweep) already exist (R4).

## J5. Scheduling (Admin)

**Flow:** admin dashboard "Pending Treatment Orders" → `/clinic-admin/treatment-sheets/orders` worklist (`GET /treatment-sheets/clinic/{t}/treatment-orders`, serves `lifecycle_status` + label; filters: state, scheduling status, dates, therapist, overdue>24h) → per sheet: schedule rows (`PATCH …/rows/{row}/schedule`, therapist/room/date/time with gender-policy + schedule-config validation; auto-creates/updates the linked `therapy_multi_day` appointment) or bulk-schedule, or deny (structured `TreatmentDenialReason`), or place on hold (expiry-swept) → fully scheduled ⇒ `state=SCHEDULED` (`lifecycle: SCHEDULED_AWAITING_TREATMENT_SHEET → …`).

**Owner:** Clinic Admin (canonical, R4).
**Handoff:** to Therapist via release (doctor/admin releases sheet → `released_at` set → visible on therapist dashboard).
**Pain points (live):** Failure A — this exact worklist GET 500s on dev data (investigation paused mid-trace; repair-on-read sweeps inside `list_orders` are the suspect area). The list endpoint performing repair *writes* on read is a known architectural tension (documented R4 pattern).
**Confusion:** minimal for admins — this is one of the clearest surfaces.
**Strengths:** single worklist with a single business status per row; structured denial; hold semantics; version-conflict (OCC) on scheduling writes.

## J6. Therapist Session (execution)

**Flow:** `/therapist` → `TherapistDashboardScreen` (release-gated: only sheets with `released_at` appear) → start session (`POST /treatment-sheets/{id}/sessions` → row/sheet `IN_PROGRESS`) → execute → complete rows + record materials (permissions: `treatment_session.complete`, `material.record`) → last active row completed ⇒ lifecycle `NEEDS_CLINICAL_REVIEW` → hands back to Doctor (J7-adjacent: review outcomes).

**Owner:** Therapist executes; cannot alter plan/schedule (RBAC + release gate).
**Handoff:** to Doctor for Clinical Review (5 outcomes: continue/update-future/extend → stay IN_THERAPY; stop-remaining/mark-complete → COMPLETED with reason).
**Pain points:** 891-line single-file screen (maintenance); daily progress notes share the pending-documentation fragility (J7).
**Confusion:** lowest of any role — one screen, one job.
**Strengths:** the product's best example of a guided, role-owned, state-gated surface; the review handback closes the clinical loop without therapist state decisions.

## J7. Daily Progress / Pending Documentation

**Flow:** per-day session documentation happens either in-session (therapist) or afterward by the doctor via the **Pending Documentation widget** on `/doctor` (`usePendingDocumentationQuery` — computed **client-side** from treatment-sheet rows) → tap lands on treatment-sheet detail (outside the consult flow) → fill day rows.

**Owner:** ambiguous by design today — doctor widget + therapist session notes both write progress; server has no owned "pending documentation" definition (documented product gap, prior audit #9-product).
**Pain points:** deferred-memory loop (doctor must remember to return); definition drifts per client since it's client-computed.
**Confusion:** widget label names a bucket, not a next action; tapping exits the doctor's mental context into sheet-detail.
**Strengths:** the widget exists at all (right instinct); all underlying row data is server-side and queryable — a server-owned read model has everything it needs.

## J8. Patient History

**Flow (intended):** doctor, from appointment card → "View Patient History."
**Flow (actual, live):** routes to `/clinic-admin/clients/[clientId]` — the admin client-management page, which exposes appointment-creation and admin actions to the doctor (**Failure D**). A read-only `ClinicalTimeline` exists (R3B, confirmed read-only-by-construction in R4's plan) plus per-client document lists, but no doctor-owned composed history surface; episodes list is reachable 3 ways (prior audit).

**Owner:** should be Doctor (read); actually lands in Admin ownership.
**Pain points:** wrong ownership + wrong affordances; history is scattered across client detail, episodes, timeline, and per-document lists.
**Strengths:** every ingredient exists (timeline, episodes with visit counts, document lists, KPIs) — this is a composition gap, not a data gap.

## J9. Episode Closure

**Flow:** episodes are created/linked at consultation (J3); closure lives on `EpisodeDetailScreen` (1,150 lines) / episodes feature (status transitions on the episode entity); a visit-completing consult updates `visits_count`/episode state; no explicit closure step exists in the doctor's day flow — episodes close from the episode screen, reached via any of its 3 doorways.

**Owner:** Doctor (clinical closure) on an admin-namespaced screen.
**Pain points:** closure is undiscoverable from the flow where it matters (end of a course of care); three episode-ish screens overlap (Detail / Workspace / Consultation).
**Confusion:** what closing an episode *means* (vs completing a visit vs completing treatment) is never presented.
**Strengths:** episode anchoring itself (R2/R3B) is sound and consistently enforced (casesheet/appointment/sheet all carry `episode_id` with inheritance checks in services).

## J10. Subscription

**Flow (live paths only):** registration/application → tenant created with `subscription_plan` (default FREE, or tier mapped at go-live) → **checkout** (`POST /billing/tenants/{id}/subscription`, `SubscriptionCheckoutService`) creates the one real `OrgSubscription` row + syncs `subscription_plan`; **trial conversion** (`TrialService.convert_trial_to_subscription`) sets plan directly (no `OrgSubscription` row); **org-admin PATCH** can set any plan string (no catalog validation). Plan drives module entitlement via `included_modules` → `PermissionSyncService` (legacy path) and, post-R5-merge, via the capability platform's `ActivePlanResolver` + plan-capability links (flag-gated).

**Owner:** Billing domain (checkout); Super Admin (manual override); R5 capability platform (entitlement consumption).
**Pain points (confirmed dead/missing, T-A.2):** no live upgrade/downgrade (`SubscriptionService` unreachable); no trial auto-expiry; 6 uncoordinated writers of `subscription_plan`; most tenants have no `OrgSubscription` row (dev DB: rows exist for checkout-path tenants only).
**Confusion:** none user-visible yet — because the *user-facing* subscription management surface barely exists (super-admin billing + owner add-clinic are the only touchpoints).
**Strengths:** R5's 3-tier `ActivePlanResolver` already absorbs the historical mess honestly (active-subscription → legacy-projection → minimum-floor, with fallback metrics); plan→capability parity is proven.

## J11. Onboarding (tenant creation → ready)

**Flow:** register → application (`draft → pending_review`) → Super Admin reviews (`/super-admin/applications/[id]`) → approved → `/onboarding/choice` (demo or real setup) → setup wizard (progressive-experience steps; step-detail; resumable; `is_ready_to_go_live` gate) → go-live (`go_live_service`: creates tenant, maps tier→plan, seeds RBAC roles + permissions, seeds `tenant_features` (mechanism #7), applies clinic-type template) → role dispatch (J-root) → post-live setup banner on admin dashboard for remaining steps.

**Owner:** its own protected workstream (progressive-experience spec + recovery worktrees; 7 release blockers list) — **not R8 territory**.
**Pain points:** tracked in its own hardening spec (alias routing, submit-ordering, duplicate submission, back-button, idempotency).
**Strengths:** the most explicitly governed journey in the product; clean handoff into role dashboards; demo path exists.

## J12. Production Activation (go-live → first real day)

**Flow:** `is_ready_to_go_live=false` ⇒ `index` forces `/onboarding/setup-wizard`; once true ⇒ role dispatch; admin dashboard shows setup banner for incomplete optional steps; capability platform (post-R5) resolves availability from plan+template+toggles from day one (template defaults now seeded — T-F.2b).

**Owner:** Onboarding → Admin.
**Pain points:** the boundary between "wizard steps" and "settings you finish later" is only a banner; first-day guidance for each role is absent (each role lands on their dashboard cold).
**Strengths:** the gate itself is reliable and server-owned; template-driven defaults mean a new clinic starts coherent per specialty.

---

## Cross-journey observations (facts, not proposals)

1. **Every clinical journey routes through admin IA** except the therapist's (J3, J4, J7, J8, J9 all live under `/clinic-admin/*`).
2. **The backend already computes every state these journeys need** — the failures are all in composition/gating/routing (J3-B, J4-C, J5-A, J8-D).
3. **Handoffs are backend-real but UI-invisible**: recommend→schedule (doctor never sees the decision), execute→review (appears only as a worklist change), desk→doctor (a list item appears).
4. **The therapist journey is the internal gold standard**: release-gated worklist, one job, no leaked machinery.
5. **Three journeys have no owner surface at all**: front-desk (J1/J2 run in admin), patient-history-as-a-doctor-task (J8), episode closure in-flow (J9).

*End. No future-state journeys are described in this document.*
