# R7 Billing Actionability Contract — Owner Ratification

**Status:** RATIFIED · **Date:** 2026-10-03 · **Scope:** R7 reconciliation governance addendum

## Problem and boundary

`T-BE-F.1` is complete as the additive, capability-gated **billing-read** contract. It does not supply the governed write/action path required for an R7 workspace invoice-create affordance. Its historical evidence and completion status are unchanged.

This addendum freezes that missing prerequisite as `T-BE-F.1a · Governed Visit-scoped invoice action contract`. It does not implement F.1a, reopen F.1, or change the frozen requirements.

## Authority and default grants

Billing-stage presence follows the existing effective `billing` capability. Invoice actions require the narrower effective `billing.invoicing` capability **and** the applicable canonical `invoice.*` permission; no capability or permission is duplicated.

| Default seeded role | `invoice.create` | `invoice.update` | `invoice.collect_payment` |
|---|---:|---:|---:|
| Doctor | No | No | No |
| Admin | Yes | Yes | Yes |
| Receptionist / Front Desk | Yes | Yes | Yes |

These are governed default RBAC grants, not frontend role checks. Organizations may change role composition through RBAC. Backend enforcement remains the authorization boundary; frontend consumes resolved capability/permission state only for presentation.

## Governed Visit-scoped action

For an R7 workspace invocation, the frontend supplies only `appointment_id` as clinical context. The backend resolves authenticated tenant → appointment → client → active Visit, validates each relationship, and validates any clinical-service reference against that tenant and resolved Visit. Route/query identifiers never establish authorization. Invalid context is rejected atomically, including cross-tenant/IDOR attempts.

The workspace reuses `/clinic-admin/billing/invoices/create` through a governed route builder carrying `appointmentId`; it creates no competing route. That invocation bypasses the legacy placeholder client-selection path because ownership is server-derived. Compatible generic legacy invoice creation remains intact.

## Completion and task ownership

Unbilled services remain a visible **warning only**. Billing facts, capability, permission, invoice existence, outstanding amount, and payment state must never create a frontend clinical-completion block; Clinical Workflow/completion readiness remains authoritative.

`T-BE-F.1a` owns the server-side invoice-create contract, context resolution/validation, clinical-service attribution, capability-and-permission enforcement, ratified seed grants, tenant isolation, atomic rejection, and executable evidence. After it completes, `T-FE-E.4` owns billing-stage presentation, permission-driven affordance, governed navigation, and warning rendering—not RBAC policy or authorization. `T-FE-E.6` retains its broader role/capability composition ownership.

**Traceability:** FR-BILL-1, FR-BILL-2, FR-CR-1, FR-RBAC-1, FR-WFA-2 · Design §2.5 · Decisions D6/D9 · Principles P1/P2/P8.

## Implementation reconciliation (2026-10-03)

The prerequisite ratified above is now implemented by backend commit `e2ee6600001b407aef98f48232cd5eace2526f46` on `reconciliation/r7-cos-dev-be`. Its completion gate is `VISIT_SCOPED_INVOICE_ACTION_CLEAN`, with 88 passed / 0 failed / 0 skipped. Migration `20261003_000001` follows `20261002_000003` with one Alembic head. `ET-MIG-001` remains OPEN; this completion does not claim a clean empty-database replay.

`T-FE-E.4` is now **COMPLETE** through frontend commit `d5854bd465747dbdf2a25aaea07d706ac5b162dc` on `reconciliation/r7-cos-dev-fe`: `T_FE_E4_COMPLETE`, gate `E4_BILLING_STAGE_BACKEND_TRUTH_CLEAN`, 54 passed / 0 failed / 0 skipped. It composes billing-stage presentation, resolved-permission affordance, governed navigation, and warning rendering while preserving the ratified contract: billing visibility follows effective `billing`; invoice action requires effective `billing.invoicing` plus `invoice.create`; authorization and tenant/Visit resolution stay backend-owned; the frontend never role-infers; generic invoice creation remains compatible; and unbilled state remains a warning, never a frontend completion block. `T-FE-E.6` remains a separate broader composition task, not an E.4 dependency or completion claim.

The backend completion also includes the narrow `ED-R7-DB-001` repair: ORM metadata corrected the `TenantTreatmentMaterialUsage.deleted_by_staff_id` foreign-key target from `org_staff.id` to `tenant_staff.id`. It is not a migration and does not change the R7 billing contract.
