# ADR-PE-000: Progressive Experience Documentation Governance

Status: Accepted

Date: 2026-07-11

## Context

The accepted Progressive Experience onboarding specifications were maintained under `frontend/.kiro/specs/onboarding-production-hardening`, but `.kiro/` is ignored by Git. That made the specs useful for agent work but unsuitable as the durable source of truth for implementation checkpoints, branch recovery, and audit history.

The repository already has an onboarding documentation convention under `frontend/docs/Onboarding/`. Root-level `docs/` does not exist in this repository.

## Decision

The canonical, version-controlled home for Progressive Experience onboarding documentation is:

```text
frontend/docs/Onboarding/progressive-experience/
```

The `.kiro` spec directory may remain as an agent/spec workspace mirror, but it is not the canonical source of truth. Changes accepted for implementation must be reflected in the canonical tracked docs path before work proceeds.

The canonical document set must include at minimum:

- `requirements.md`
- `design.md`
- `tasks.md`
- `ADR-PE-000.md`
- `current-behavior-inventory.md`
- `ownership-map.md`
- `migration-fixtures.md`
- `onboarding-dev-reconciliation.md`
- `progressive-experience-recovery-checkpoint.md`

## Consequences

- Progressive Experience implementation decisions become traceable to commits.
- `.kiro` remains useful for Kiro/agent workflows but cannot silently diverge from the tracked docs.
- `.gitignore` must narrowly unignore only `frontend/docs/Onboarding/progressive-experience/**`.

## Terminology

Use this phase naming system:

```text
Progressive Experience Phase 0
Progressive Experience Phase 1
Progressive Experience Phase 2
...
```

Historical mapping:

```text
Legacy "Sprint 1" = Progressive Experience production-hardening checkpoint
Legacy "release gate" = Progressive Experience production-hardening checkpoint
```

Historical commit names are not reinterpreted; they are referenced as written when needed.
