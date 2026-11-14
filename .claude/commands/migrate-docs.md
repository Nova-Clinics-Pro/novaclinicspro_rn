---
description: Migrate NovaClinics knowledge docs from Git to Google Drive, safely and in reviewable stages. RUN THIS IN YOUR LOCAL Claude Code session, where the google-drive MCP is available — not in a linked cloud session.
---

You are migrating documentation out of this Git repository (`novaclinicspro_rn`, app code under `frontend/`) into the Google Drive `NovaClinics` knowledge base, per ADR-DOC-ARCH-001. Preconditions: the `google-drive` MCP must be connected in this session (`claude mcp list` shows it), and ADR-DOC-ARCH-001 must be ratified. If either is missing, STOP and say so.

## Rules (do not break these)
- Copy to Drive and VERIFY before removing anything from Git. Never delete a Git file whose Drive copy is not confirmed.
- Dry-run first. Produce the full manifest and stop for approval before any upload or deletion.
- Git deletions happen on a task branch, staged explicitly, never `git add .`, never on `dev`/`test`/`main`.
- One authoritative copy per document; send duplicates to 10_Archive with a note on where they came from. Note: `frontend/.kiro/specs/onboarding-production-hardening/` and `frontend/docs/Onboarding/progressive-experience/` hold near-identical spec sets — reconcile to one authoritative copy.

## Step 1 — Inventory + classify (dry-run)
Walk this repo (and, when asked for pass 2, the sibling `novaclinicspro_rn-*` worktrees). For every documentation file and every support script NOT required to build/test/run/ship the app, assign a destination folder using the ADR ruleset (00–10), or mark STAY. Keep in Git: application source under `frontend/`, tests, operational scripts, API schemas imported by code, secret-free config templates, `CLAUDE.md`, `.claude/**`, code-adjacent `features/**/README.md` and `TODO.md` only if the toolchain needs them (otherwise → Drive).
Emit a manifest table: `source path | classification | destination folder | dedup-of (if duplicate) | action (upload / archive / stay)`. Present it and STOP: "Review the manifest. Reply approve to create the tree and upload."

## Step 2 — Create the tree + upload (after approval)
1. With the google-drive MCP, create the `NovaClinics` folder and the 11 subfolders (00_Project_Governance … 10_Archive) if they do not exist.
2. Upload each file to its destination folder. Preserve a readable name; where two files would collide, prefix with their spec/path.
3. After uploading, VERIFY by listing each destination folder and confirming every file is present. Report any failures; do not proceed for those.

## Step 3 — Generate the Git index
Create/update `docs/INDEX.md` in this repo: a table of `document → Drive location → one-line purpose`, so the `/feature` pipeline and developers can still find the authoritative doc. This file STAYS in Git.

## Step 4 — Remove migrated files from Git (only verified ones)
1. Create a task branch: `git switch -c chore/docs-to-drive-pass1` from the approved base.
2. `git rm` only the files confirmed present in Drive in Step 2. Stage explicitly. Leave STAY files untouched.
3. Show the full diff and the list removed. Do NOT commit until the user confirms. Never push to a shared branch without approval.

## Step 5 — Report
Files uploaded (count per folder), files archived, files removed from Git, the INDEX entries added, anything that failed verification, and the branch/working-tree status. Confirm no other worktree was touched. Recommend next pass (worktree dedup) or stop.
