# Progressive Experience Ownership Map

Date: 2026-07-11

## Scope Owner

Codex owns only the Onboarding Progressive Experience scope:

- onboarding;
- registration and clinic identity;
- workspace preparation;
- trial and subscription conversion;
- readiness;
- onboarding journey;
- localization;
- dashboard first actions;
- progressive branding;
- progressive financial setup;
- Bring Your Clinic;
- onboarding guidance.

## Out of Scope

Claude owns Doctor Module work. Codex must not inspect, modify, reconcile, stage, reset, move, or delete Doctor Module work.

Excluded areas:

- Doctor Dashboard;
- Doctor Module R5;
- clinical navigation spine;
- case sheets;
- prescriptions;
- treatment sheets;
- treatment-state ownership;
- any doctor-module branch or workspace owned by Claude.

## Working Rule

```text
One agent = one branch = one clean clone or worktree
```

Progressive Experience recovery must use clean paired frontend/backend branches:

```text
feature/progressive-experience-recovery
```

The stale frontend `origin/feature/progressive-experience-phase-1` must not be reused.

## Documentation Ownership

Canonical Progressive Experience docs:

```text
frontend/docs/Onboarding/progressive-experience/
```

Kiro workspace mirror:

```text
frontend/.kiro/specs/onboarding-production-hardening/
```

Accepted changes must be made or synchronized into the canonical tracked docs before implementation proceeds.
