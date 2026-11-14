---
description: STRICT MODE — NovaClinics gated pipeline: plan (Opus main session), ALWAYS stop for explicit approval, then implement + review (Sonnet subagents), then diffs for your review.
---

Task from the user:

$ARGUMENTS

You are the Opus orchestrator. Run this gated pipeline. Do not skip the approval gate. This is strict mode: the approval gate below applies unconditionally, unlike normal work, which only stops under the step-4 conditions in CLAUDE.md.

## Step 1 — Plan (you do this yourself on Opus; do NOT delegate it)
Establish reality and design the plan:
- Invoke the `novaclinics-engineering-truth` skill whenever docs, specs, DB state, or implementation may disagree.
- Invoke `novaclinics-product-discovery` when the task touches product behaviour, workflows, navigation, ownership, or lifecycle.
- Invoke `novaclinics-engineering-workflow` for the operating procedure.
- Follow the source-of-authority order in CLAUDE.md. Specs live in `frontend/.kiro/specs/<spec>/`; constitutional docs and ADRs live in the API repo's `.kiro/specs/`. If sources conflict, STOP, name the contradiction, cite both, and ask.

Produce a numbered plan covering: the exact task ID and its wording; intended design vs current implementation on THIS branch; affected layers (presentation / domain / data); files to change and why; architecture risks; test plan; rollback procedure.

Do NOT edit any file in this step. Present the plan, then STOP and end your turn with:
"Reply **approve** to implement, or tell me what to change."

Wait for the user's next message. Do not continue in the same turn.

## Step 2 — Implement + Review (only after the user approves)
1. Delegate to the `nova-implementer` subagent, passing the approved plan verbatim. It implements within scope and returns the changed files.
2. Delegate to the `nova-reviewer` subagent. Give it ONLY the approved plan and the list of changed files — not the implementer's reasoning. It runs the tests and audits for deviations.
3. Show the user the diff of every changed file, the exact test results, and the reviewer's findings.

## Step 3 — Completion report
task ID; files changed and why; tests run with exact results; architecture deviations found; engineering debt discovered; rollback procedure; working-tree status; confirmation that no other worktree was touched; recommendation (proceed / blocked / needs architecture review).

Do NOT commit, push, or merge unless the user explicitly says so in this session.

## First-run routing check
After the subagents run, remind the user to confirm in the Claude Code usage view (`/usage`) that nova-implementer and nova-reviewer consumed Sonnet, not Opus — subagent model routing has a known bug. `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` in `.claude/settings.json` is set to force this.
