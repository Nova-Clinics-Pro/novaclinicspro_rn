# MVP-ONB-003 — Preservation of Automatic-Approval-First Onboarding with Exceptional Manual Review

**Status:** `OWNER_RATIFIED_POLICY_SUPERSESSION`
**Date:** 2026-10-19
**Scope:** Product-policy, requirements-traceability, and decision reconciliation only. This record authorizes no implementation, schema, migration, database, role, external-identity, deployment, or Git-history change.

## Governing decision

NovaClinics shall preserve the verified working onboarding behavior during A–F Clean Architecture refactoring:

1. Eligible clinic registrations continue through the existing automatic-approval lifecycle.
2. Registrations that fail the existing implementation's eligibility conditions remain in `PENDING_REVIEW` for exceptional manual review.
3. Refactoring must not change eligibility behavior, keyword/risk evaluation, lifecycle transitions, public registration contracts, applicant status behavior, tenant provisioning semantics, UI/navigation, or clinical workflows unless a separately approved change authorizes it.

This supersedes **MVP-ONB-002** as the initial-MVP onboarding policy. MVP-ONB-002 remains an intact historical decision record; its rationale and evidence are not deleted or rewritten.

## Verified historical implementation evidence

The latest defensible pre-B2.7 baseline is backend commit `6486cad19c308403188585341e81b34e048066af` (`Onboarding runtime stabilization and template alignment`, 2026-09-28). It is an ancestor of committed backend baseline `7bf175ca86bb8e3b50d46250d297feb88f8c9473`.

The following files have identical Git blob IDs at those two commits:

- `app/application/onboarding/auto_approval_service.py`
- `app/application/onboarding/advanced_risk_scoring_service.py`
- `app/application/onboarding/self_registration_service.py`
- `app/application/onboarding/tenant_application_lifecycle_service.py`
- `app/application/services/admin_applications_service.py`
- `app/api/v1/routers/admin_applications_router.py`

The historical path is therefore source-verified as `DRAFT → PENDING_REVIEW → APPROVED` for an eligible application, with ineligible applications remaining pending review. This verifies preservation intent and implementation continuity; it does **not** ratify every historical heuristic as a security, legal, fairness, or authority control.

## Historical implementation detail — not newly ratified policy

Historical code lowercases and substring-matches business/contact names against `test`, `demo`, `sample`, `example`, and `placeholder`; emails against `test`, `demo`, `sample`, `fake`, and `temp`; and temporary-domain substrings including `tempmail`, `10minutemail`, `guerrillamail`, and `mailinator`. The historical automatic-approval threshold is `0.95`, with additional legacy risk factors.

These are source-derived facts only. This decision does not expand, normalize, replace, or newly approve the threshold, keyword list, scoring weights, validator, authority, or other business rule.

## Requirements reconciliation

The authoritative frozen source is `backend/.kiro/specs/mobile-app-onboarding/requirements.md`:

- **US-1.2** requires smart auto-approval-oriented business-profile collection.
- **US-2.1** requires risk-based automatic approval below a threshold and manual review for higher-risk applications.

Those requirements already support automatic-approval-first behavior with exceptional manual review. No amendment to the frozen requirements is proposed by this decision. MVP-ONB-002's manual-review-only interpretation was inconsistent with them and is superseded by this record. Any future change to US-1.2 or US-2.1 remains subject to their established change-control process.

## Security and operational boundary

Preservation is not security ratification. The following remain open:

- `B2.7-B-ISS-001`: historical policy is reconciled, but automatic-decision authority/provenance, runtime verification, and pre-existing manual-review operational defects remain unresolved.
- `B2.7-FO-002`: authorized pre-tenant reviewer scope, organization-to-tenant ownership enforcement, separation of duties, and update-actor attribution remain independent security blockers.
- `B2_7_BLOCKED` remains in force. B2.8 must not advance automatically.

Existing B2.7 research, hybrid-policy, India-authority, final-matrix, and Option-A records remain historical/long-term evidence. They must not be interpreted as authorization for a new automatic-approval engine, validator, authority integration, threshold, or rule change.

## Traceability disposition

| Record | Disposition under MVP-ONB-003 |
| --- | --- |
| MVP-ONB-002 | Historical, superseded for initial-MVP onboarding policy only. |
| B2.7-B Lifecycle Contract | Automatic-approval-first preservation controls product interpretation; its D1/PF-018 security requirements remain open and are not waived. |
| B2.7 Parent Closure Assessment | Continue to report `B2_7_BLOCKED`; reassess only after separately authorized operational/security evidence. |
| B2.7-B-ISS-001 records | Preserve verified historical behavior; keep policy-authority, provenance, and manual-review defects open. |
| B2.7-FO-002 records | Unchanged independent security blocker. |
| Hybrid, final-matrix, India, and Option-A records | Retained as historical/long-term analysis, not current implementation authority. |

## Next required authorization

Before any code change, Product Owner and Security must approve a narrowly scoped preservation/defect remediation plan that separates:

1. behavior-preserving regression tests for the existing automatic-first path; from
2. independently authorized security remediation for reviewer authority, immutable audit/provenance, notifications, and transaction ownership.
