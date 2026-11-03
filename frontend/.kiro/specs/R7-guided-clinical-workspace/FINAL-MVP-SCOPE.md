# FINAL-MVP-SCOPE — NovaClinics Clinical Operating System

**Status: proposed, not yet owner-approved.** Derived from `IMPLEMENTATION-ROADMAP.md`'s Phase 3 capability-level MVP re-evaluation. Three sections only, as specified.

---

## Included in MVP

Only capabilities judged genuinely required — the product cannot honestly be called a Clinical Operating System without each of these:

1. **Clinical Workspace Shell & Briefing** — the entry point itself. *(Already shipped.)*
2. **Patient Safety Surface** — minimal, verified-only safety context; a clinical product cannot ship with none. *(Already shipped.)*
3. **Workflow Engine** — the backend-owned stage assembly that is R7's own reason for existing (Decision 9). *(Backend shipped; frontend rendering remains.)*
4. **Recommendation Engine** — "recommend, never decide" (Decision 7), the product's core interaction model. *(Backend shipped; frontend rendering remains.)*
5. **Case Sheet Continuity** — fixes a real, verified clinical-record-integrity defect (F-1). *(Backend shipped; frontend composition remains.)*
6. **Prescription Management** — everyday clinical workflow, intentionally minimal scope. *(Backend already compliant; frontend composition remains.)*
7. **Treatment Recommendation & Plan (creation)** — the marquee new entity R7 exists to deliver. *(Backend shipped; frontend composition remains.)* Plan *versioning* specifically is excluded — see Deferred section.
8. **Session Scheduling** — without it, a Plan exists but no course can actually run; the product's primary use case (multi-session therapy) is unusable without this. *(Not yet started; real remaining engineering.)*
9. **Therapist Execution** — recording what actually happened; required for the product's own therapy-centric audience. *(Not yet started; real remaining engineering — the most negotiable "required" item in this scope, flagged for a possible future owner conversation, not softened here.)*
10. **Billing Visibility** — read-only, but central to the Admin/Front-desk daily workflow this product is meant to replace. *(Backend shipped; frontend composition remains.)*
11. **Clinical History** — explicitly RATIFIED as "in R7, not R8" (Decision 10); no textual basis exists to override that ratification. *(Not yet started; backend prerequisites now unblocked.)*
12. **Role-Based Workflow** — a hard dependency of Billing Visibility and Therapist Execution being reachable by the roles that need them (Admin/Front-desk, Therapist). *(Not yet started.)*
13. **Legacy Navigation** — the actual on-ramp; without it, users arriving via existing entry points never reach the new workspace regardless of flag state. *(Not yet started.)*

---

## Deferred to Post-MVP

Everything intentionally postponed, with reasons:

1. **Living Documents (supersession/amendment)** — `design.md` §2.6 states directly: *"R7 core ships without amendment (Group G defers cleanly)."* This is the one deferral with explicit textual design permission, not just this exercise's own judgment. Consequence: SIGNED documents remain locked forever, exactly as they are today pre-R7, with no path to amend — the pre-existing behavior continues unchanged, nothing regresses.
2. **Treatment Plan versioning (FR-TP-3's amendment half, `T-BE-D.5`)** — deferred alongside Living Documents specifically because `T-BE-D.5` is itself blocked on `T-BE-G.1` (the same supersession mechanism). Plan *creation* ships; Plan *amendment* does not.
3. **Mobile-First Presentation, full polish (`T-FE-G.1`, `T-FE-G.2`)** — the underlying Command Center shell already renders and is mobile-safe (part of the already-shipped Capability #1). What's deferred is sticky-next-action behavior, pill-rail scroll animation, and the dedicated accessibility pass — interaction polish layered on already-functional components, not a missing capability.
4. **Performance sanity check (`T-Z.5`)** — valuable, not blocking; no requirement's own AC names a specific performance threshold this gates.
5. **Legacy deprecation readiness (`T-Z.6`)** — by `FR-LEG-1`'s own text, R7 reaches at most the "Redirect" stage; this task prepares for "Deprecate," a stage R7 itself does not reach.
6. **R8 handoff package (`T-Z.7`)** — by definition prepares R8, not R7's own release.

---

## Accepted Risks

Every risk consciously accepted to ship the scope above, stated plainly rather than hidden in a footnote:

**Technical debt:**
- `ED-ARCH-002` (`PrescriptionStatus` dead enum, zero runtime usage) ships unresolved — correctly out of scope, but present.
- `ED-ARCH-003` (unbacked frontend `allergies` field) ships un-surfaced but *not removed at the source* — the register's own words: "an unbacked clinical-safety field in a shipped client entity is a latent hazard regardless of R7."
- `ED-ARCH-001`'s residual ~18 non-R7 files remain unremediated (correctly outside R7's declared reuse scope, but a standing codebase-wide risk).
- Two new gaps `T--1.2`'s own trace doc found — dormant `casesheet.sign`/`prescription.sign` permissions bypassed by hardcoded role checks, and a `billing.view`→`invoice.read` naming mismatch — are not yet tracked as debt items anywhere.

**Missing automation:**
- **No CI-enforced frontend architecture regression test exists.** Every frontend layer-boundary fix already shipped (`T-0.2`–`T-0.9`) is verified only by a manually-run, manually-documented grep sweep at task-completion time. Shipping MVP without closing this means every subsequent frontend change carries an un-alarmed risk of silently reintroducing an `ED-ARCH-001`-class violation. This is the single largest accepted process risk in this scope.
- No End-to-End test of any kind exists anywhere in either repository, for any capability, including the ones marked "Complete" above.

**Documentation gaps:**
- `CLAUDE.md` has never been committed in either repository for the entire R7 effort — the governing layer-integrity rules this effort claims to follow are not part of either repository's committed history.
- `.kiro/constitution/`, ADR content, and the backend's own `ENGINEERING-TRUTH.md` (dated 2026-07-15, before nearly the entire R7 effort) are untracked or stale.
- `tasks.md`'s own task-count arithmetic is stale (states 77, actual is 80) and has not been corrected.

**Architecture gaps:**
- `DocumentStatus`'s docstring still directly contradicts the ratified Living Documents model ("SIGNED: Immutable, terminal state") — accepted to ship as-is since Living Documents itself is deferred (Section 2 above), but it means the codebase's own documentation is actively wrong about a shipping entity's semantics.
- `ETX-4`'s resolution status is stated differently in `requirements.md` (still open) than in `design.md` (resolved) — never reconciled.
- The Recommendation-source architecture required a mid-flight correction (Decision 11) after the original design assumed an entity that had already been removed from the codebase before R7 began — the fix shipped cleanly, but it is evidence the design-freeze process did not fully validate this specific requirement against Engineering Truth before `tasks.md` was frozen. No reason to expect this is the only such gap; it is simply the one that was caught.

**Product-scope risk, named explicitly rather than left implicit:**
- Therapist Execution (Capability #9) and Clinical History (Capability #12) are both included above on evidence-backed reasoning, but both are also flagged in `IMPLEMENTATION-ROADMAP.md` Phase 3 as the two most negotiable "required" items — if implementation timeline pressure emerges, these are the first two capabilities worth an explicit owner conversation about, rather than either being silently descoped or silently forced through under schedule pressure.
