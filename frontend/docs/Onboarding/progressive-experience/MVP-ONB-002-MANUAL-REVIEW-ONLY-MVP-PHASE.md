# MVP-ONB-002 — Manual-Review-Only MVP Phase

> **Historical decision — superseded for initial-MVP onboarding policy on 2026-10-19.**
> [MVP-ONB-003](./MVP-ONB-003-AUTOMATIC-APPROVAL-FIRST-PRESERVATION.md)
> restores the verified automatic-approval-first product requirement with
> exceptional manual review. This record is retained unchanged as historical
> rationale and does not authorize implementation changes.

**Status:** `OWNER_RATIFIED_POLICY_AMENDMENT`
**Date:** 2026-10-19
**Scope:** Initial MVP registration approval policy only; documentation and
decision reconciliation. This record authorizes no production-code, lifecycle,
schema, role, migration, database, or deployment change.

## Ratified decision

For the initial NovaClinics MVP:

1. Automatic clinic approval is deferred.
2. No automatic-approval criterion, threshold, validator, evidence authority,
   production integration, or approval cohort is introduced.
3. Applications requiring approval follow the manual-review lifecycle.
4. OD1 validation remains proportionate to initial registration and workspace
   creation.
5. OD2 remains optional for general onboarding.
6. Legal verification, identity, RBAC, tenant isolation, and clinical
   authorization controls remain mandatory.
7. Existing registration behavior and lifecycle transitions do not change
   without separate approval.

This supersedes the earlier requirement that genuine automatic approval be
available at MVP launch. It does **not** remove automatic approval from the
long-term architecture, nor does it approve a fallback implementation of any
automatic decision.

## Historical-policy disposition and frozen requirements

The prior automatic-approval records remain intact as historical and long-term
design evidence. In particular, the historical gate
`MVP_LAUNCH_BLOCKED_UNTIL_AUTO_APPROVAL_VERIFIED` is superseded for the initial
MVP only; `INDIA_VALIDATOR_OPTIONS_REQUIRE_EXTERNAL_CONFIRMATION` remains true
for any future India automatic-approval path.

Frozen requirements are not overwritten by this record. Their formal change
control must record the MVP narrowing before a requirements baseline is revised.
The required change-control target is the frozen mobile-onboarding requirements
`US-1.2` and `US-2.1` referenced by the existing B2.7 policy record. The
lifecycle contract now traces the ratified MVP policy separately from D1 and
PF-018, which continue to govern any future automatic path.

## B2.7-B-ISS-001 disposition

`B2.7-B-ISS-001` is
`POLICY_RATIFIED__MANUAL_REVIEW_OPERATIONS_EVIDENCE_PENDING`.

The policy-choice blocker is resolved for the initial MVP. The issue is not
operationally closed: the evidence below must be established before B2.7 parent
closure can treat manual review as an accepted operating control. `B2_7_BLOCKED`
remains in force. `B2.7-FO-002` remains open and is not resolved by this policy.

## Manual-review operational evidence

| Control | Verified source evidence | Current readiness | Open evidence / gap |
| --- | --- | --- | --- |
| Authorized reviewer role | ADR-PF-010 specifies an authenticated Platform Operations or Platform Security principal with explicit non-bypassable `platform.clinic_contact_verification.approve`; organization or tenant roles alone cannot approve. | Contractually specified; runtime assignment and enforcement not verified here. | Identify the live application-review approval/rejection permission and prove its platform scope and non-bypass behavior. |
| Organization/tenant ownership | ADR-PF-010 requires verifier independence from the destination organization and requester. | Not proven for application review. | `B2.7-FO-002`: organization-to-tenant ownership and update-actor propagation require the separate security review. |
| Decision and audit ownership | ADR-PF-010 requires verifier identity, reason, timestamp, lifecycle version, and immutable audit for manual evidence decisions. | Evidence contract exists; application-review audit persistence is not verified here. | Trace application approve/reject command, durable audit/outbox, reviewer attribution, and rollback behavior. |
| Applicant status and notification | Existing frontend has pending-review and rejected status surfaces, and the B2.7-B3 child established applicant-status isolation. | Status UI evidence exists; end-to-end reviewer decision notification behavior is not proven. | Verify public outcome, applicant-only read, notification delivery/absence, and safe error/retry behavior. |
| Approval/rejection authorization | ADR-PF-010 supplies a strict manual evidence authority, not proof of a platform-wide application-review authority. | Not proven. | Confirm exact reviewer audience, authorization dependency, approval/rejection scope, and separation of duties. |
| Security controls | Identity, RBAC, tenant isolation, and clinical authorization remain mandatory by MVP-ONB-002. | No waiver. | Complete `B2.7-FO-002`; assess audit provenance, organization ownership, and update-actor gaps. |

The table deliberately separates ADR-level contract evidence from verified runtime
operation. No row asserts that manual review is operationally complete.

## Decision-register reconciliation

| Record | Disposition under MVP-ONB-002 |
| --- | --- |
| B2.7-B Lifecycle Contract | Amended at policy layer only; D1/PF-018 retained for future automatic approval. |
| B2.7 Parent Closure Assessment | ISS-001 policy choice resolved; manual-review operating evidence and `B2.7-FO-002` remain closure work. |
| Final Owner Approval Matrix, Hybrid Policy, Existing Policy Ratification, and Option A Gate | Retained as historical/long-term automatic-approval material; not MVP implementation authority. |
| India authority assessment | Retained as research; neither Kerala/Karnataka nor HFR/M4 is an approved MVP automatic cohort or production integration. |

## Exact next action

Authorize a **read-only B2.7 manual-review operational evidence assessment**.
It must trace the existing application-review routes, reviewer authorization,
organization/tenant ownership checks, reviewer/audit persistence, applicant
status and notification behavior, and failure/rollback semantics. It must
separately preserve `B2.7-FO-002` as open and request a bounded security
decision/correction only if the evidence identifies a genuine gap.
