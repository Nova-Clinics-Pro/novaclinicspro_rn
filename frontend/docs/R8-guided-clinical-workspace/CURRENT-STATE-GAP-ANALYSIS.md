# R8 Discovery — Current-State Gap Analysis

> **Status:** Discovery only. No redesign, no requirements, no implementation.
> **Date:** 2026-07-14 · **Branch:** `spec/r8-guided-clinical-workspace` (from frontend `origin/dev` @ `b1534e6e`)
> **Backend reference:** `origin/dev` @ `9dba7d1` · **R5 branch reference (ahead of dev):** `feature/r5-capability-platform`
> **Method:** direct code audit of both repos (routes, features, services, repositories, seeds, RBAC), full read of the governing spec trail (`.kiro/specs/*` in the backend repo, R5 + onboarding specs in the frontend repo), plus four live production failures observed 2026-07-14 (documented in §7.3) and the R5 engagement's own live-database findings.
>
> **Panel framing:** CPO · Chief Clinical Architect · UX Research Lead · Principal Software Architect.
> **Question this document answers:** *what exists, what is excellent, what is confusing, what can be reused, and exactly why R8 is needed.*

---

## 1. Executive Summary

NovaClinicsPro's backend is a genuinely strong, constitution-governed, multi-tenant clinical platform. Seven phases (R0–R7 planned; R0–R5 substantially executed, R4 complete, R5 in Group F on its own branch) built real ownership boundaries: one writer per clinical artifact, a pure treatment-lifecycle resolver, a capability platform with entitlement/enablement separation, RBAC with permission-sync, and an onboarding pipeline that provisions tenants end-to-end. **Almost none of this needs to change for R8.**

The product problem is concentrated in one place: **the presentation layer speaks the implementation's language, not the clinician's.** The doctor works inside an administrator's URL space (`/clinic-admin/*`), assembles a consultation from four document-named accordion modules (Case Sheet, Prescription, Treatment Recommendation, Clinical Services), is shown lifecycle vocabulary ("Episode", "Sheet", "FINAL", "Ordered"), and is offered actions the backend will reject (the live `FINAL → FINAL` failure). The backend already knows the answer to "what should happen next" — the R4 lifecycle resolver computes exactly one business status per treatment; the appointment/casesheet/episode state machines are all backend-owned — but **no read model composes these into a per-patient or per-role "next action," so every screen makes the user derive it.**

Four production failures observed on 2026-07-14 are the empirical proof of this gap, and all four are presentation/read-model failures over a healthy core:

| Failure | Surface symptom | What it actually demonstrates |
|---|---|---|
| A | Treatment-orders worklist GET returns 500 | Worklist read path fragility (root cause investigation was paused for this discovery; see §7.3) |
| B | "Complete Consultation" attempts `FINAL → FINAL` | UI derives action availability from stale/assumed state instead of canonical backend state |
| C | "Send to Admin for Scheduling" fails twice (FINAL→FINAL, then a 500) | A multi-step clinical handoff has no state-aware orchestration in the presentation layer |
| D | "View Patient History" opens admin client management | Navigation ownership: doctor actions route into admin IA with admin affordances (create appointment) |

**The one-sentence conclusion:** R8 is needed not because anything is missing from the platform, but because the platform's answers are not yet *composed and presented as guidance* — and the discovery evidence says this is achievable almost entirely at the Presentation and Read Model layers, with backend domain/service/repository reuse of ~90–95%.

---

## 2. Document Authority Map (conflicts identified, none silently resolved)

The mandatory-reading trail contains overlapping documents from different dates. Where they disagree, the newer, more specific document governs. Conflicts found:

| # | Older document | Newer document | Disagreement | Authoritative |
|---|---|---|---|---|
| 1 | `doctor-module-ux-audit/phase1-discovery-analysis.md` (2026-07-03) — "no single plain-language status" (its Top-UX-problem #1) | `R4-treatment-state-ownership` (complete, backend `dev` 2026-07-11) | R4 shipped the single backend-computed `lifecycle_status` (11 statuses + honest `UNRESOLVED` sentinel) | **R4.** The UX audit's #1 problem is *partially* solved: the resolver exists and the worklist serves it, but the three raw state machines (`status`, `state`, `scheduling_status`, + row status) remain stored and still leak into several screens. |
| 2 | Same UX audit — "treatment workflow gated to `clinic_type ∈ {ayurveda, physio}`" (its finding #2) | `R5-capability-platform` specs (frontend R5 branch, 2026-07-13/14) | R5 replaced clinic-type gating with the capability catalog/resolver **on the backend, behind a default-OFF flag, on its own branch** | **R5 — but not yet on `dev`.** On `dev` today, `useFeatures()` with hardcoded `isTherapyClinicType()` is still the live frontend gate (15+ consumer files, verified). R5's `useCapabilities()`/`<CapabilityGate>` exist only on the R5 branch; frontend consumer migration is R5 task T-F.2d, not started. |
| 3 | `design.md` §2.4 (R5) — "`PermissionSyncService` is the confirmed reader" of `subscription_plan` | R5 `tasks.md` T-A.2 audit (2026-07-13) | T-A.2 found 8 reader sites, 6 live writer sites, and a second independently-coded entitlement engine in `rbac_seed.py` | **T-A.2** (explicitly amended into the R5 record). |
| 4 | R5 T-A.3 §4/§11 transcription of template data | R5 T-F.2b live-database read (2026-07-14) | T-A.3 claimed `prescriptions.core` absent from dental (it is present) and `allow_multiday` false everywhere (it is **true** for ayurveda/physio) | **The live database.** Both discrepancies are recorded in T-F.2b's completion report; the `allow_multiday` one is consequential (blocks R5 T-F.2c re-point as scoped). |
| 5 | `constitutional-compliance/10 – Phase Planning` (R0–R7 ladder) | Actual execution state | The ladder is authoritative for *intent*; execution reality is: R4 merged to `dev`; R5 at Group F on its branch (flag OFF, retirement paused); R6/R7 not started; a production regression-audit branch was opened 2026-07-14 and is itself paused for this discovery | Ladder for intent, branch state for reality. R8 must be sequenced against *both*. |
| 6 | Onboarding spec naming ("Sprint 1", legacy branch names) | `onboarding-production-hardening/requirements.md` phase-terminology section | Progressive Experience Phase N naming supersedes | The hardening spec (it says so explicitly). |

**Repository-hygiene finding (this discovery's own):** frontend `dev`'s `.gitignore` excludes `*.md`, `frontend/docs/`, and `.kiro/` globally — the entire frontend documentation trail is invisible to version control on `dev` (the exact defect backend RH-001/RH-002 fixed). This branch adds the minimal narrow allowlist for these two files only; a proper hygiene pass is an R8-adjacent debt item, not done here.

---

## 3. Constitutional Invariants — what R8 must never change

Verified present and load-bearing in code (not just in documents):

1. **Clean Architecture layering** — routers → application services → repositories → models; presentation code calls repositories through data-layer hooks, never Axios directly (frontend `features/*/data/{datasources,repositories,models}` pattern is consistent across all 36 feature modules).
2. **One writer per clinical artifact** — Case Sheet, Prescription, Treatment Recommendation/Sheet, Progress Notes each have exactly one authoring surface (R4's screen-retirement plan classified every screen A/B/C/D; the canonical modules are `CaseSheetModule`, `PrescriptionModule`, `TreatmentRecommendationModule`).
3. **Backend-authoritative state transitions** — `assert_valid_sheet_transition` is the single sheet state-machine enforcement point; casesheet DRAFT→FINAL is enforced server-side (Failure B proves the backend correctly rejects what the UI wrongly offers — the backend rule must *not* be weakened).
4. **The pure resolvers** — `treatment_lifecycle_resolver.py` (R4) and `capability_resolver.py` (R5) are pure domain functions with dependency-direction tests. They are exactly the "derive, never store" pattern R8's read models should extend, not bypass.
5. **Tenant isolation** — every clinical query is tenant-scoped; R5 added AC-SEC-1/5 negative tests (cross-tenant read/PATCH rejected).
6. **RBAC composition, never merger** — capability enablement never mutates permission rows (NFR-7, structurally tested); `require_permission()` guards every relevant endpoint.
7. **Capability Platform ownership** — one catalog, one dependency graph, one tenant-override table, one resolver (R5 OWNERSHIP.md table; 7 legacy mechanisms classified, none undecided).
8. **Flag-first rollback** — every risky phase reverses by flag before code (`freshness_v1`, `clinical_spine_v1`, `treatment_lifecycle_v1`, `capability_platform_v1` all follow the same env-driven pattern in `get_tenant_features`).

---

## 4. Role-by-Role Audit

Backend role reality (verified in `rbac_seed.py` + org-role seeding): system role `TENANT_ADMIN` (all permissions); role templates `DOCTOR`, `THERAPIST`, `RECEPTIONIST`, `FRONT_DESK_EMPLOYEE`; org-level roles `CLINIC_OWNER`, `CLINIC_ADMIN`, `DOCTOR` seeded per tenant; super-admin is org-level (`require_org_admin`). **No `JUNIOR_DOCTOR`, `ASSESSMENT_ASSISTANT`, or `OPERATIONAL_SUPERVISOR` role exists anywhere in either repo** — three of the nine roles in the audit brief are not implemented at all.

Frontend routing reality (`app/index.tsx:106–122`): role dispatch reads `currentUser.roles[0]` (first role string, lowercased) and routes to exactly three destinations — `/doctor`, `/therapist`, or `/clinic-admin` (owner, admin, receptionist, tenant-admin, and **every unknown role** all land on `/clinic-admin`). Org admins route to `/super-admin`; multi-clinic owners have `/owner`.

### 4.1 Super Admin / Organization Admin

| | |
|---|---|
| **Current dashboard** | `app/super-admin/index.tsx` — system-wide overview |
| **Current navigation** | Applications review (`/super-admin/applications`, approve/reject tenant applications), Tenant management (`/super-admin/tenants`, create/detail), **per-tenant RBAC administration** (`/super-admin/tenants/[id]/rbac/{roles,permissions,users,audit}`), Billing (`/super-admin/billing`), System settings |
| **Responsibilities/ownership** | Tenant lifecycle (application → approval → creation), platform RBAC catalog, cross-tenant oversight, platform billing |
| **Strengths** | Complete, purpose-built, role-owned namespace — the *only* persona whose IA matches its mental model. RBAC admin per tenant is thorough (roles, permissions, user-role assignment, audit history). |
| **Weaknesses** | Tenant detail doesn't yet surface R5 capability state (the R5 `CapabilitiesSettingsScreen` is tenant-admin-facing, on the R5 branch); no platform-level capability catalog view (deliberate — N-7 forbids tenant-facing catalog curation, but a super-admin read view is a genuine gap). |
| **Confusion observed** | None structural. |
| **Reusable** | Everything: `adminApplications`, `tenants`, `rbac` features; `admin_applications_router`, `org_tenants_router`, `rbac_*` routers. |
| **Gap / Reuse % / Recommendation** | Desired ≈ current + capability visibility. **Reuse: ~95%.** **KEEP as-is; audit-only additions.** R8 must not redesign or duplicate this. |

### 4.2 Clinic Owner

| | |
|---|---|
| **Current dashboard** | `app/owner/index.tsx` — multi-clinic portfolio view (high-level metrics per clinic, navigate into a clinic) + `add-clinic` |
| **Current navigation** | Portfolio → select clinic → lands in that clinic's `/clinic-admin` |
| **Responsibilities** | Cross-clinic oversight; everything else delegated to the clinic-admin surface |
| **Strengths** | The portfolio concept exists and is role-owned |
| **Weaknesses** | Single-clinic owners never see it — routing sends `clinic owner` role straight to `/clinic-admin` (verified in `index.tsx` role list), so "owner" and "administrator" are the same experience for most tenants |
| **Confusion** | Owner-vs-admin responsibilities are not differentiated once inside a clinic |
| **Gap / Reuse % / Recommendation** | Desired: owner sees business health; admin sees operations. **Reuse: ~80%** (portfolio shell + all admin features). **MINOR–MODERATE**: differentiation is a read-model/dashboard-composition question, not new plumbing. |

### 4.3 Clinic Administrator

| | |
|---|---|
| **Current dashboard** | `app/clinic-admin/index.tsx` (1,031 lines): stats row (Total Appointments, Active Staff, Daily Revenue, Inventory Alerts), Pending Treatment Orders link → `treatment-sheets/orders`, ~10 quick actions, post-onboarding setup banner, staff feedback section |
| **Current navigation** | The largest namespace in the product (≈75 of 118 route files): appointments, clients (+ per-client casesheets/prescriptions/treatment-sheets), episodes, treatment-sheets (+ **orders worklist** — the R4 Scheduling Decision surface), treatment-sessions, staff (+leave), inventory, billing (invoices/payments), analytics, reports, bulk-upload, settings (rooms, treatments, templates, operating hours, appointment rules, global), branding, feedback |
| **Responsibilities/ownership** | Scheduling Decision (approve/deny/hold treatment orders — R4 ADR ownership), appointment management, client records administration, staff/leave, inventory, billing, clinic configuration |
| **Strengths** | Functionally near-complete operations console; the orders worklist correctly owns the scheduling decision with denial reasons + on-hold (R4); rich settings surface; R5's capabilities settings screen will slot in here (T-E.3, on R5 branch) |
| **Weaknesses** | It is also the **de-facto home of doctor and receptionist work** — clinical detail screens (casesheet/prescription/treatment-sheet views) live here, so admin IA hosts clinical workflows it doesn't own. Dashboard shows metrics-first, tasks-second. |
| **Confusion** | "Which of these 10 quick actions is my job right now?"; treatment vocabulary (Orders/Sheets/Sessions as three menu items) exposes the implementation split |
| **Reusable** | Nearly everything — this is the deepest feature investment in the product |
| **Gap / Reuse % / Recommendation** | Desired: same capabilities, task-first composition, minus the clinical screens that belong to clinical roles. **Reuse: ~90%.** **MINOR IMPROVEMENT** for the console itself; the *extraction* of clinical surfaces is the doctor-side work, not an admin redesign. |

### 4.4 Receptionist

| | |
|---|---|
| **Current dashboard** | None of her own — routed to `/clinic-admin` (verified) |
| **Current navigation** | Full admin namespace, trimmed only by RBAC-denied API calls failing |
| **Responsibilities (per RBAC template)** | Appointments (CRUD+cancel), client creation/read, read-only clinical docs, print/download prescriptions |
| **Strengths** | The RBAC template is well-scoped; appointment + client features are mature |
| **Weaknesses** | **Role exists in RBAC but not in UX.** She sees the admin dashboard (revenue stats, inventory alerts, staff feedback) — permission-gated data she cannot act on, plus navigation to screens that 403. |
| **Confusion** | Everything not-hers is still visible as chrome |
| **Gap / Reuse % / Recommendation** | Desired: front-desk task surface (today's arrivals, book/check-in, new patient). All building blocks exist (`appointments`, `clients` features, `DashboardQuickActions`, `DateStrip`). **Reuse: ~85%.** **MODERATE REDESIGN** (composition of existing pieces into a role surface, not new capability). |

### 4.5 Assessment Assistant — **NOT IMPLEMENTED**

No role, no permission template, no screen, no route (verified by repo-wide search). If R8 wants it, it is *new product scope*, not a redesign — and the RBAC role-template mechanism + `staffDashboards` widget kit are the obvious substrate. **Reuse of substrate: high; reuse of role: 0% (doesn't exist).** Recommendation: explicitly decide in R8 requirements whether this persona is in scope; do not imply it exists.

### 4.6 Doctor

| | |
|---|---|
| **Current dashboard** | `app/doctor.tsx` (1,025 lines): date-strip day list (via shared `useDoctorDashboardQuery`), KPI grid + period selector + time-metrics (`doctorDashboard` feature), pending-documentation widget, multi-day sessions widget, treatment-series-attention widget, quick actions ("View Schedule" → `/clinic-admin/appointments`, "View Patients" → `/clinic-admin/clients`), on-leave banner, feedback section |
| **Current navigation** | **Everything beyond the dashboard is `/clinic-admin/*`** — appointment detail, start-consultation, link/create episode, consultation workspace (`/clinic-admin/episodes/[id]/consultation`), complete-consultation, per-client documents. The prior doctor-module audit's #1 navigation finding, still true on `dev`, and the direct cause of Failure D. |
| **The consultation surface** | `ConsultationWorkspaceScreen` (171 lines, R3A/R3B): accordion of PatientSummary + **CaseSheetModule** (424 lines, autosave, ref-bridged flush) + **PrescriptionModule** + **TreatmentRecommendationModule** (owns send-to-admin, coupled to `ensureCasesheetExists`) + **ClinicalServicesModule**, one expanded section default (`chiefComplaint`), single "Save & Submit" → `CompleteConsultationScreen` (219 lines) which performs the DRAFT→FINAL transition |
| **Responsibilities/ownership** | Consultation documentation, prescription signing, treatment recommendation, clinical review outcomes (R4: 5 outcomes), episode linkage decisions |
| **Strengths** | The accordion's *content modules* are the best clinical UI in the product (single canonical editors, autosave, specialty extension slot exists — Ayurveda section); the day-list + date-strip dashboard core is right; R4 gave the backend a single per-treatment business status; lifecycle labels/colors already have frontend mappers (`getLifecycleStatusLabel/Color`) |
| **Weaknesses** | Document-first (4 modules named after artifacts, not tasks); no next-action guidance; action gating derived from stale/assumed state (Failure B: Complete offered on already-FINAL; Failure C: handoff repeats a completed transition); admin namespace + admin affordances (Failure D); "Clinical Services" module unexplained (its feature module has *no presentation layer at all* — `features/clinicalServices/` contains only data-layer files, confirming it is a data concept surfaced raw); episode Link/Create decision forced before clinical work; three episode-ish screens (`EpisodeDetailScreen` 1,150 lines, `EpisodeWorkspaceScreen` 353 — with an unreachable `doctor` mode, `ConsultationWorkspaceScreen`) |
| **Confusion (documented, live)** | The 2026-07-03 audit's Top-20 lists (largely still valid on `dev`); the four 2026-07-14 production failures; collapsed sections with no completeness indication |
| **Reusable** | All four content modules as building blocks; `useConsultationWorkspace` hook; day-list/date-strip/KPI kit; lifecycle status mappers; every backend endpoint it touches |
| **Gap / Reuse % / Recommendation** | Desired: "what do I do next for this patient," role-owned navigation, state-derived actions. **Reuse: ~75% of parts, ~0% of the shell.** **MAJOR REDESIGN of shell/navigation; KEEP module internals.** This is R8's center of gravity. |

### 4.7 Junior Doctor — **NOT IMPLEMENTED**

No role template, no differentiated flow (no co-sign/supervision concept anywhere in RBAC or clinical services). Same verdict as 4.5: new scope if wanted; RBAC template mechanism ready. **Reuse of substrate: high; role: 0%.**

### 4.8 Therapist

| | |
|---|---|
| **Current dashboard** | `app/therapist.tsx` → `TherapistDashboardScreen` (891 lines) — the sole Therapy Execution surface (R4-confirmed sole `IN_PROGRESS` trigger), release-gated (only released sheets appear), session start/complete, material recording |
| **Responsibilities/ownership** | Therapy execution only — correctly narrow |
| **Strengths** | The cleanest clinical role: one screen, one job, backend-release-gated worklist, R4's Clinical Review handback (all-rows-done → NEEDS_CLINICAL_REVIEW → doctor) closes the loop without therapist-side state decisions |
| **Weaknesses** | 891 lines of single-file screen (maintainability, not UX); day-progress notes flow shares the pending-documentation fragility class |
| **Confusion** | Minimal — the role proves the thesis that a narrow, task-first surface works |
| **Gap / Reuse % / Recommendation** | **Reuse: ~90%. KEEP / MINOR IMPROVEMENT.** R8 should treat this as the internal benchmark for "guided." |

### 4.9 Operational Supervisor — **NOT IMPLEMENTED**

No role, no screen. The *data* for an ops view exists (orders worklist, on-hold sweeps, overdue filter `ordered > 24h`, paused-series widget), so a future ops surface is a read-model composition. **Substrate reuse: high; role: 0%.**

### 4.10 Role audit summary

| Role | Exists? | Own surface? | Reuse % | Verdict |
|---|---|---|---|---|
| Super Admin | ✅ | ✅ own namespace | ~95% | KEEP (audit-only additions) |
| Clinic Owner | ✅ | ◐ portfolio only (multi-clinic) | ~80% | MINOR–MODERATE |
| Clinic Administrator | ✅ | ✅ (but hosts everyone else) | ~90% | MINOR (console) |
| Receptionist | ✅ RBAC only | ❌ | ~85% | MODERATE (compose existing) |
| Assessment Assistant | ❌ | ❌ | substrate only | Decide scope explicitly |
| Doctor | ✅ | ◐ dashboard only; work lives in admin IA | ~75% parts | **MAJOR (shell), KEEP (modules)** |
| Junior Doctor | ❌ | ❌ | substrate only | Decide scope explicitly |
| Therapist | ✅ | ✅ | ~90% | KEEP / MINOR |
| Operational Supervisor | ❌ | ❌ | substrate only | Decide scope explicitly |

---

## 5. Subsystem Audit

### 5.1 Backend

| Subsystem | Current implementation (verified) | Reuse? | Extend? | Replace? | Risk for R8 |
|---|---|---|---|---|---|
| **Application services** | 49 services; clinical core (`treatment_sheets_service`, `casesheets`, `episodes`, `appointments`, `clinical services`) mature and R4-aligned | ✅ wholesale | Possibly one new read-model service (see Read Models) | ❌ | Low — R8 reads; doesn't rewrite |
| **Repositories** | Consistent SQLAlchemy repos; treatment-order repo carries R4's repair-on-read sweeps (backfill, state repair, on-hold sweep run inside `list_orders`) | ✅ | — | ❌ | **Medium (known):** repair-on-read means a GET performs writes; Failure A (worklist 500) sits on this path — root cause pending in the paused regression audit. R8 must not add more write-on-read. |
| **Domain model** | Ownership per artifact; two pure resolvers (R4 lifecycle, R5 capability); state machines with single enforcement points | ✅ constitutional | New *derived* read models only (OW-2 pattern) | ❌ | Low |
| **Capability Platform (R5)** | Complete on its branch through Group E + T-F.0/1/2b: catalog (14 capabilities), plan links, template defaults (34 rows live-seeded), resolver, admin toggle w/ OCC versioning, localization, `GET/PATCH /tenants/{id}/capabilities`, catalog endpoint. Flag default OFF. Retirement (T-F.2a/c) pending; known `allow_multiday` parity gap blocks T-F.2c. | ✅ | R8 consumes it for "what is available" — the designed purpose | ❌ | **Sequencing:** R8 must state whether it depends on R5 merging to dev, and must not create a second entitlement mechanism (FR-C3 forbids a "seventh") |
| **RBAC** | `org_permissions` (module-tagged) → `tenant_permissions`; `PermissionSyncService` + creation-time seeding unified behind one seam (R5 T-D.5); role templates; per-tenant role admin UI (super-admin) | ✅ untouched | — | ❌ | Low. NFR-7 (capability ≠ permission mutation) must stay tested |
| **Subscription Platform** | Live: checkout (`SubscriptionCheckoutService`), trial conversion; plans FREE/BASIC/PRO/ENTERPRISE. **Known debt (T-A.2, confirmed):** `SubscriptionService` (upgrade/cancel) is dead code; no live upgrade/downgrade path; trial auto-expiry dead; 6 independent writers of `OrgTenant.subscription_plan`, mostly without `OrgSubscription` rows; org-admin PATCH can set any plan string | ✅ for reads | Fixing writers is **R5-C.2b/R6 territory, not R8** | ❌ | Low for R8 (read-only relationship), but R8 dashboards must read plan via `ActivePlanResolver` (3-tier), never raw `subscription_plan` |
| **Read models** | `get_tenant_features` (BC-1-frozen shape), doctor dashboard endpoint, KPIs endpoint, treatment-order worklist (+`lifecycle_status` attached), episode details w/ visits, pending-documentation (client-side computed — a documented product gap) | ✅ | **The R8 gap lives here:** no "next action for patient/role" composition; pending-documentation needs a server-owned definition | ❌ | Medium — new read models must stay derive-only (no new writable status) |
| **Eventing/outbox** | `OutboxEventPublisher`, `TenantCreatedEvent` → RBAC+capability seeding handler | ✅ | — | ❌ | Low |
| **Onboarding/provisioning** | Application → approval → go-live (`go_live_service` creates tenant, seeds RBAC, `tenant_features` (mechanism #7, classified (C) untouchable by R5), templates by clinic type; demo path; progressive-experience hardening spec (7 release blockers) | ✅ | — | ❌ | Low — R8 shouldn't touch onboarding (its own protected workstream + worktrees) |

### 5.2 Frontend

| Subsystem | Current implementation (verified) | Reuse? | Extend? | Replace? | Risk |
|---|---|---|---|---|---|
| **Feature modules** | 36 modules, uniform clean structure (`data/{api,dtos,repository}` + `presentation/{hooks,components,pages}`) | ✅ ~90% of data layers wholesale | — | ❌ | Low |
| **Navigation** | Expo Router file tree; **role dispatch = `roles[0]` string switch to 3 destinations, unknown → clinic-admin** (`app/index.tsx`); doctor/receptionist have no namespace; back-stack unpredictability + stale-screen-reuse documented in prior audit and still present | ◐ shell mechanics | — | **Doctor/receptionist IA: REPLACE** (new namespaces); admin/super-admin/therapist trees: KEEP | **This is R8's highest-risk area** — but it is presentation-only |
| **Components** | `core/components` is thin (7: DashboardHeader, DateStrip, StatCard, QuickActionButton, ProtectedRoute, ConfirmationDialog, DateTimePicker); real riches live in feature widgets (`staffDashboards`: quick actions, empty state, on-leave banner, stats row, session list, multi-day/paused/unscheduled widgets; `doctorDashboard` KPI kit; `AppointmentRow`) | ✅ ~70–80% as building blocks | Promote shared widgets out of `staffDashboards` | ❌ | Low |
| **Hooks/query** | React Query throughout; per-feature repository hooks; R5 adds `useCapabilities`/`useToggleCapability`/`useCapabilityCatalog` + `<CapabilityGate>` (branch); `useFeatures` w/ hardcoded therapy-set still live on dev (15+ consumers — the T-F.2d migration list) | ✅ | R8 consumes `useCapabilities` post-R5-merge | `useFeatures` is already scheduled for retirement by R5, not by R8 | Low, **sequencing-coupled to R5** |
| **State-derived action gating** | Largely absent — screens enable actions optimistically (Failures B/C/D); `ProtectedRoute` exists (permission-gating, first used by R5's T-E.3) | ◐ | **Core R8 build:** derive availability from canonical reads (lifecycle_status, casesheet status, capabilities, RBAC) | — | Medium |
| **Design system** | `useClinicTheme` + typography/spacing/colors tokens; per-clinic theming | ✅ | — | ❌ | Low |

### 5.3 Reuse estimate (aggregate)

| Layer | Reuse estimate | Basis |
|---|---|---|
| Backend domain + services + repos | **~90–95%** | R8 adds read models; touches no writer |
| Backend API surface | **~95% + few additions** | 64 routers cover everything except next-action composition |
| Capability/RBAC/Subscription platforms | **100% (consume as-is)** | Designed for exactly this |
| Frontend data layer (36 modules) | **~90%** | Uniform, already repository-patterned |
| Frontend widgets/components | **~70–80%** | Recomposition, not rebuild |
| Frontend navigation/shell (doctor + receptionist) | **~10–20%** | The genuinely new construction |
| Consultation content modules | **~85% internals** | Shell replaced, editors kept |

---

## 6. Screen Classification (every current route)

Legend: **KEEP** / **MINOR** (improvement) / **MODERATE** / **MAJOR** (redesign) / **REPLACE**. Verdicts are about the *experience*, not the code behind it (data layers are reusable almost everywhere).

### 6.1 Entry, auth, shared

| Route | Classification | Why |
|---|---|---|
| `index` (role dispatch) | **MAJOR** | `roles[0]` string switch, 3 destinations, unknown→admin — must become deliberate role→surface mapping (presentation-only change) |
| `login`, `register`, `forgot/reset-password`, `logout` | **KEEP** | Standard, working |
| `profile` | **MINOR** | Read-only dead-end ("future update") noted in prior audit |
| `notifications/*`, `notification-preferences` | **KEEP** | Complete subsystem |
| `feedback/[token]` | **KEEP** | Tokenized patient feedback, working |
| `localization`, `tenant-localization`, `theme-demo` | **KEEP** (demo screen: dev-only) | |

### 6.2 Onboarding (protected workstream — R8 hands off)

| Route | Classification | Why |
|---|---|---|
| `onboarding/{choice,setup-wizard,wizard-flow,step-detail,improve,pending-review,rejected}` | **KEEP** | Governed by its own hardening spec + recovery worktrees; explicitly out of R8 scope |

### 6.3 Super Admin

| Route | Classification | Why |
|---|---|---|
| `super-admin/index`, `applications/*`, `tenants/*`, `tenants/[id]/rbac/*`, `billing`, `system-settings` | **KEEP** | Purpose-built role namespace; audit found no structural confusion. Only *addition* candidate: tenant capability visibility (R5 exposes the API). |

### 6.4 Owner

| Route | Classification | Why |
|---|---|---|
| `owner/index`, `owner/add-clinic` | **MINOR** | Portfolio works; gap is owner-vs-admin differentiation and reachability for single-clinic owners |

### 6.5 Clinic-admin — operations console (admin-owned, stays admin)

| Route | Classification | Why |
|---|---|---|
| `clinic-admin/index` (dashboard) | **MODERATE** | Solid data, metrics-first composition; task-primacy + role de-mixing needed; also serves 3 personas today |
| `appointments/{index,create,[id],preview}` | **MINOR** | Mature; two `AppointmentListItem` variants create inconsistent actions (prior audit #10) |
| `clients/index`, `clients/[id]` | **MINOR** as admin screens | Fine for admin; the problem is *doctors being sent here* (Failure D), which is a routing fix, not a screen fix |
| `treatment-sheets/orders` (worklist) | **KEEP** | R4-canonical Scheduling Decision surface (deny/hold/schedule); serves `lifecycle_status`; the 500 (Failure A) is a defect on its API, not a design flaw |
| `treatment-sheets/[id]/{index,schedule}` | **MINOR** | Canonical treatment workspace per R4 retirement plan |
| `treatment-sessions/*` | **MINOR** | Execution records; fine |
| `staff/*`, `staff-management`, `staff/leave` | **KEEP** | Mature |
| `inventory/*` (7 screens) | **KEEP** | Complete subsystem |
| `billing/*` (invoices, payments) | **KEEP** | Complete subsystem |
| `analytics/*`, `reports` | **KEEP** | |
| `bulk-upload/*` | **KEEP** | |
| `settings/*` (incl. rooms, treatments, templates, operating-hours, appointment-rules, global; + capabilities from R5 branch) | **KEEP** | R5's capabilities screen lands here by design |
| `branding`, `feedback` | **KEEP** | |

### 6.6 Clinical surfaces currently trapped in `/clinic-admin/*` (the R8 core)

| Route | Classification | Why |
|---|---|---|
| `appointments/[id]/start-consultation` | **MAJOR** | Entry to consultation forces episode Link/Create decision pre-clinically; "start" destinations diverge (prior audit) |
| `appointments/[id]/{create,link}-episode` | **MODERATE** | Needed capability; wrong moment/ownership in flow |
| `episodes/[id]/consultation` (ConsultationWorkspace) | **MAJOR (shell) / KEEP (modules)** | The accordion shell is document-first with no guidance; its four content modules are the best editors in the product and must survive |
| `episodes/[id]/complete-consultation` | **MAJOR** | Failure B lives here: offers FINAL→FINAL; must become state-aware (idempotent-aware UI over an unchanged backend rule) |
| `episodes/[id]/index` (EpisodeDetail, 1,150 lines) | **MODERATE** | One of three episode-ish screens; overlap must collapse (which one survives is an R8 design decision, not made here) |
| `episodes/[id]/workspace` (EpisodeWorkspace) | **MODERATE/REPLACE-candidate** | Contains an unreachable `doctor` mode (dead branch, prior audit #9/product #12); R4 already demoted its casesheet tab to read-only |
| `clients/[id]/casesheets/{index,[id],new,edit}` | **MODERATE** | R4 retirement plan classifies standalone create/edit as **C: redirect to canonical module** — verify execution state during R8, don't re-litigate |
| `clients/[id]/prescriptions/{index,[id],new,edit}` | **MODERATE** | Same as casesheets |
| `clients/[id]/treatment-sheets/*` | **MINOR** | Read paths fine |
| `clients/[id]/episodes` | **MODERATE** | Third doorway into episodes |

### 6.7 Role dashboards

| Route | Classification | Why |
|---|---|---|
| `doctor` | **MAJOR** | Right ingredients (day list, KPIs, pending-doc, series widgets), wrong composition (metrics compete with tasks; quick actions eject into admin IA; no next-action) |
| `therapist` | **KEEP / MINOR** | The product's own proof that task-first works |

---

## 7. UX Audit — implementation leakage, invalid actions, terminology

### 7.1 Screens exposing implementation instead of workflow

1. Consultation accordion = four artifact names (Case Sheet / Prescription / Treatment Recommendation / Clinical Services) — the exact "documents instead of responsibilities" pattern; **Clinical Services has no presentation feature at all** (data-layer-only module) yet is a top-level doctor-facing section.
2. Episode Link/Create decision demanded before any clinical work.
3. Treatment menu split as Orders / Sheets / Sessions (three implementation nouns for one clinical continuum) in admin navigation.
4. Raw state machines still visible in places (`status` DRAFT/FINAL, `state`, scheduling badges) despite R4's single `lifecycle_status` existing precisely to replace that exposure.
5. Doctor URLs literally read `/clinic-admin/...`.

### 7.2 Buttons/actions that should never appear (live evidence)

- "Complete Consultation" on an already-FINAL casesheet (**Failure B**, reproduced 2026-07-14).
- "Send to Admin for Scheduling" that re-runs finalization and then 500s (**Failure C**).
- Appointment-creation affordances inside what the doctor reached as "Patient History" (**Failure D**).
- Quick actions on the doctor dashboard that eject into admin list screens.

### 7.3 The four production failures — discovery status (fix work is the paused regression-audit branch, **not** R8)

| | Reproduced | Root cause status | R8 relevance |
|---|---|---|---|
| A (worklist 500) | Yes (dev DB has 1 qualifying order sheet, tenant `286c…61d0`) | **Investigation paused mid-trace** — suspicion set: repair-on-read path in `list_orders` (backfill/state-repair/on-hold sweeps) or serialization of attached lifecycle fields; stack trace not yet captured. Owned by `fix/clinical-workflow-regressions-pre-r5-retirement`. | Read-path fragility R8 will lean on |
| B (FINAL→FINAL) | Yes | UI-side stale/assumed state; backend rule correct | The archetype R8 exists to eliminate |
| C (recommendation 500 + repeat transition) | Yes (first half); 500 unreproduced pending A | Flow couples finalize+submit without state awareness | Handoff orchestration gap |
| D (history → admin page) | Yes | Route ownership | Navigation ownership gap |

### 7.4 Terminology confusing to clinicians (observed in UI strings/routes)

“Episode” · “Case Sheet” vs “Sheet” vs “Treatment Sheet” · “Order” vs “Recommendation” (one entity, `is_order` flag) · “Clinical Services” · “Workspace” ×3 · “FINAL/SIGNED” · “Series/Session X of Y” unexplained · “Pending Documentation” as a widget label rather than a guided continuation.

### 7.5 Role/state leakage

- Receptionist sees admin metrics/chrome (role leakage by shared dashboard).
- Doctor sees scheduling machinery (state leakage across the R4 ownership boundary that the *backend* enforces but the *UI* ignores).
- `EpisodeWorkspaceScreen`'s dead `doctor` mode is abandoned-surface leakage.

---

## 8. AI Position (observations only — no design)

| Where AI could help later | Where deterministic logic must remain (non-negotiable) |
|---|---|
| Narrative summaries: patient history/episode recaps at consult start; day-plan summaries; discharge/handoff notes drafts | State transitions (casesheet/sheet/appointment machines), the R4 lifecycle resolver, the R5 capability resolver, RBAC/permission sync, scheduling validation, tenant isolation |
| Explaining *why* an action is unavailable (translating `blocked_reason_code`/lifecycle into clinician language) | The *computation* of availability itself |
| Drafting progress-note prose from structured session data | The structured record of what happened |
| Search/recall across a patient's longitudinal record | — |

**AI must never be authoritative** for entitlement, permission, clinical state, or scheduling decisions; anything AI-produced is presentation-layer, clearly attributed, and regenerable. (This mirrors OW-2's "derived, never a competing writable field" discipline.)

---

## 9. Why R8 — the synthesis

1. **The guidance the vision demands already exists as data, not as experience.** R4's resolver answers "where is this treatment"; R5 answers "what can this clinic do"; RBAC answers "what may this user do"; appointments/casesheets answer "where is this visit." No layer composes these into "what should *you* do *next*" — that composition is a read model + presentation problem, which is exactly R8's stated boundary.
2. **Role surfaces are unevenly productized.** Therapist proves the pattern works; Super Admin proves namespacing works; Doctor and Receptionist are the gaps — one mis-homed, one non-existent.
3. **The four live failures are all guidance failures.** None require domain rewrites; all require canonical-state-derived UI and correctly-owned routes.
4. **Reuse is overwhelmingly available.** ~90%+ of backend, ~85–90% of frontend data layers, and the best clinical editors survive intact. The new construction is: role navigation shells, a next-action read model, state-derived action gating, and clinician vocabulary.
5. **Sequencing constraints are real and must be declared in R8's requirements:** (a) R5 Group F is mid-flight on its own branch with retirement paused — R8 must define its relationship to the capability platform's merge; (b) the regression-audit branch owns Failures A–D fixes; (c) onboarding is protected; (d) frontend `dev`'s doc-hygiene gap (§2) needs a home.

---

*End of gap analysis. Companion document: [ROLE-JOURNEYS.md](ROLE-JOURNEYS.md). No UX, requirements, design, or tasks are proposed here.*
