# NovaClinicsPro — Frontend (React Native / Expo)

Application code lives in `frontend/`. Run all package scripts from there.

## 1. Product identity

NovaClinicsPro is a multi-tenant clinical platform whose ambition is to become an
operating system for patient recovery — it remembers the patient's clinical journey,
shows what changed, and coordinates the clinic after a decision is made.

The experience must guide each role toward its next responsibility. Do not surface
database entities, status enums, or implementation terminology as the user's mental
model. A screen answers "what do I do next?", not "here is a table row".

## 2. Sources of authority

When sources disagree, this order governs:

1. Latest explicitly approved constitutional decision or ADR
2. Approved requirements
3. Approved design
4. Approved tasks
5. Current production code and database behavior
6. Historical documents

Specs live in `frontend/.kiro/specs/<spec>/` (`requirements.md`, `design.md`,
`tasks.md`). Constitutional documents and ADRs (`ADR-P1-xx`) live in the **API**
repository under `.kiro/specs/` — notably `constitutional-compliance/`,
`phase-1-clinical-platform-trust/`, and `phase-2-clinical-workflow-alignment/`
(which also carry `engineering-debt.md`).

Never silently pick a winner when sources conflict. Name the contradiction, cite both
sources, and ask. Always keep these distinct, and say which one you mean:

- intended design
- current implementation on this branch
- implementation on another branch or worktree
- live database behavior
- known engineering debt

A capability or abstraction described in a spec may not exist on the branch you are
on. Verify before relying on it.

## 3. Architecture invariants

### Mandatory Architecture Rule — Layer Integrity (permanent)

Dependency direction is strict and must never be violated.

```
Presentation
      ↓
Application / Use Cases (hooks, application services)
      ↓
Domain (entities, repository interfaces)
      ↓
Data (repositories, datasources — the only layer that touches transport)
```

Forbidden:
- ❌ Presentation → `axiosClient` directly
- ❌ Presentation → a `data/datasources/*.api.ts` datasource directly
- ❌ Presentation → Supabase client directly
- ❌ Presentation bypassing an existing repository or application service to reach data itself

Every HTTP/API operation MUST go through `data/datasources/*.api.ts`,
reached via a hook or application service — never called from a
presentation component or page directly. See `frontend/.kiro/engineering/
ENGINEERING-DEBT.md` (`ED-ARCH-001`) for currently-known violations of this
rule and the plan to fix them incrementally — do not treat their existence
as license to add more.

**Mandatory pre-implementation audit.** Before writing code for any task,
check: is every dependency flowing downward; is any layer bypassed; is
`axiosClient` or a datasource imported from presentation; is an existing
repository/hook/application service bypassed. If any check fails: stop,
report the violation, fix the architecture first (or explicitly defer to
`ED-ARCH-001` and say why), then continue. This rule outranks
implementation convenience — if a requested implementation appears to
require violating it, stop and explain why instead of building a shortcut.

- Use existing repositories, hooks, and application services. Reuse before replacing.
- Do not introduce a duplicate writer for state that already has one.
- The backend is authoritative for state transitions. The frontend reflects state; it
  does not decide it.
- Capability entitlement (what the tenant has bought/enabled) and RBAC permission
  (what this user may do) are separate concepts. Never collapse them into one check.
- Tenant isolation must never be weakened. No cross-tenant reads, writes, or caches.
- Use canonical route builders (e.g. `features/doctorDashboard/application/consultationRoutes.ts`).
  Do not rebuild route strings inline.
- No raw plan-string or clinic-type string checks in presentation when a governed
  abstraction exists (e.g. `CLINIC_TYPES` / `ClinicType` in `core/hooks/useFeatures.ts`).
- Documents support the clinical journey; they are not the user's mental model.

## 4. Frontend rules

- Follow the existing feature structure. Do not invent new layouts:
  `frontend/features/<feature>/{data/{datasources,repositories,models},domain/{entities,repositories},presentation/{pages,components,hooks,context,config}}`
  Shared code lives in `frontend/core/` (`api`, `hooks`, `components`, `providers`,
  `localization`, `theme`, `utils`). Routes live in `frontend/app/` (expo-router).
- Keep domain logic and data access out of presentation components.
- Use React Query (TanStack v5) through the established hooks, not ad-hoc fetching.
- After a mutation, invalidate or update the canonical caches. Do not force remounts
  to fake freshness.
- Derive action availability from current backend state. Never enable an action the
  backend cannot legally perform.
- Loading, error, empty, and completed states are mandatory for every data surface.
- Use localization keys (`core/localization`, `en-US.json` / `hi-IN.json`). Never
  introduce hardcoded user-facing text.
- Preserve accessibility (labels, roles, hit targets, safe-area handling).
- Backend authorization is authoritative. Hiding a route or component is presentation
  polish, never an access control mechanism.

## 5. Git and worktree safety

- Before editing, inspect branch, HEAD, upstream, and working-tree state.
- Work only in the repository/worktree the task explicitly names. Legacy sibling
  worktrees (`novaclinicspro_rn-*`) are pending retirement review — never modify them,
  and never touch another agent's worktree, unless the task names it.
- Never implement features directly on `main`, `dev`, or `test`.
- Work on the authoritative consolidated branch, or on a task-specific branch from the
  approved base; use a separate worktree only as allowed by section 9 (Repository
  Workspace Policy).
- Commercial Platform work uses the permanent `cp` integration branch as its
  approved base. Commercial Platform feature branches must originate from
  synchronized `origin/cp`, never from `dev`; `cp` remains integration-only.
- Stage only intended files. Never `git add .`.
- Never commit `.env` files, secrets, caches, generated files, or unrelated docs.
- Stop when the requested task is complete.
- Never silently merge, promote, delete branches, or push to `dev`/`test`.

## 6. Task execution discipline

- Confirm the exact task ID and its wording before starting.
- Verify dependencies are actually in place, on this branch.
- Read the current code before designing a replacement for it.
- Report unexpected findings before making a material product decision.
- Distinguish a bug fix from an architecture redesign, and say which you are doing.
- Implement one approved task at a time.
- Run focused tests first (`yarn test`, jest via `jest-expo`, specs under
  `frontend/tests/`), then relevant regression tests.
- Compare failures against the established baseline; pre-existing failures are not
  yours to silently absorb or silently fix.
- Update authoritative task documentation where the task requires it.
- Report: files changed, tests run, commits, push status, working-tree status.
- Stop for review when instructed.

## 7. Clinical and product safety

- Do not invent clinical business rules. Ask.
- Do not weaken a backend transition to accommodate a stale UI.
- Do not let non-clinical roles make clinical decisions.
- Progress observation must not become treatment authorization unless explicitly approved.
- Preserve clinical records when entitlement changes. Losing entitlement hides
  features; it never deletes clinical history.
- Optional AI may summarize trusted structured data. It must not diagnose, prescribe,
  calculate unsupported prognosis, mutate authoritative records, or become required
  for workflow completion. Suggestions remain drafts; clinician approval is mandatory.

## 8. Communication

- Explain material architectural choices in plain language.
- Flag uncertainty rather than presenting a guess as fact.
- Do not overclaim verification. State exactly what you ran.
- Distinguish mocked tests, controlled-database tests, and live-database verification.
- Never claim a migration chain is clean when only an isolated migration was tested.
- Ask for approval before destructive or shared-database writes unless the task
  already authorizes them explicitly.
- Completion reports must be factual and traceable.

## 9. Repository Workspace Policy

This policy is identical in the frontend and backend repositories.

- One authoritative checkout by default.
- Create a temporary task-specific worktree only when concurrent, independent
  implementation genuinely requires it.
- Remove a temporary worktree once its changes are integrated, verified and committed.
- Do not create permanent parallel implementation branches, and do not leave stale
  worktrees (including worktrees whose directory has disappeared).
- The consolidated branches (`integration/refactoring-consolidated` in the frontend and
  backend repositories) remain the authoritative development branches. Promotion to
  `dev` requires explicit approval.
- Commercial Platform work keeps its own base rule (section 5): feature branches
  originate from synchronized `origin/cp`, and `cp` remains integration-only.
