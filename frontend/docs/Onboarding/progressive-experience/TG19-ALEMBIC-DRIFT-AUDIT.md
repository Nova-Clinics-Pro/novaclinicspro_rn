# TG19 Alembic Model/Schema Drift Audit

Date: 2026-07-21

Status: COMPLETE — TG19 CORRECTION REQUIRED

Scope: Repository-wide Alembic autogenerate comparison on
`feature/progressive-experience-recovery`

Verification baseline: `efdf90c0af1eade66ead437e53caae70c1e21a98`

## 1. Executive Decision

**Decision C — mixed result.**

The current `alembic check` report contains exactly **226 proposed operations**:
**80 table removals** and **146 index removals**. It contains no proposed column,
constraint, foreign-key, type, nullability, or server-default operation.

Every one of the 226 current operations is classified `TG19_REGRESSION`.
Commit `c43ee45` removed every model import from
`app/infrastructure/db/migrations/env.py` while leaving comments that claim all
models are imported. `target_metadata = Base.metadata` is therefore empty.
Alembic reflects 80 real migrated tables from PostgreSQL, sees zero registered
application tables, and proposes deleting the entire reflected application
schema and its indexes. These are destructive false-positive operations caused
by metadata registration failure—not evidence that the 80 tables or 146 indexes
are absent from the database.

This TG19 regression masks older repository metadata debt. At ancestor
`14522967f8a063b53b7f29c0b2b8e9cbc750b573`, `env.py` still imported a
limited model list, but `alembic check` could not complete because
`tenant_treatment_material_usage.deleted_by_staff_id` referenced unregistered
table `org_staff`. That older failure requires a separately owned metadata
reconciliation after the TG19 registration regression is corrected.

A release-gate exception is **not justified yet**. The TG19 correction is small
and exact: restore deterministic, complete Alembic model registration before
assigning `target_metadata`, add a guard proving metadata is non-empty and
contains the TG19 tables, then rerun `alembic check`. Any residual differences
after that correction belong to the separate repository schema-reconciliation
initiative and may be evaluated independently for an exception.

## 2. Reproduction Evidence

A new isolated PostgreSQL database was created and migrated from base to the
single head `20260720_190000`. `alembic current` and `alembic heads`
confirmed that revision. Running `alembic check` then emitted 226 operations.

Observed operation shape:

| Operation | Count |
|---|---:|
| Remove table | 80 |
| Remove index | 146 |
| All other operation types | 0 |
| **Total** | **226** |

The result is deterministic and is not a test-data artifact: it reproduces on a
fresh database immediately after the full migration chain.

## 3. Classification Totals

| Required classification | Count |
|---|---:|
| `TG19_REGRESSION` | **226** |
| `PRE_EXISTING_MISSING_MIGRATION` | 0 |
| `STALE_MODEL_METADATA` | 0 |
| `INTENTIONAL_SCHEMA_ONLY` | 0 |
| `INTENTIONAL_MODEL_ONLY` | 0 |
| `REFLECTION_OR_NAMING_DIFFERENCE` | 0 |
| `HISTORICAL_MIGRATION_DEBT` | 0 |
| `TEST_ENVIRONMENT_ARTIFACT` | 0 |
| `REQUIRES_ARCHITECTURE_DECISION` | 0 |
| **Total** | **226** |

The ancestor's unresolved `org_staff` metadata reference is historical debt,
but it is not one of the 226 current proposed operations and is therefore not
included in those item totals.

## 4. TG19 Versus Pre-existing Schema Objects

Of the schema objects implicated by the 226 false-positive operations:

- **33 operations** concern nine TG19-created tables and their 24 indexes.
- **193 operations** concern 71 tables/index groups that existed before TG19.
- **All 226 operations were introduced into the check result by TG19's empty
  metadata registry**, regardless of the age of the affected database object.

No evidence indicates that TG19 migrations failed to create their tables,
indexes, constraints, or foreign keys. The TG19 PostgreSQL migration and
regression suites passed. The defect is solely the Alembic comparison registry.

## 5. Exhaustive Inventory

Each row classifies the table-removal operation and every named index-removal
operation listed in that row. The “Items” count is one table plus the exact
number of indexes shown. Consequently, all 226 individual operations are
accounted for exactly once.

| Table | Items | Proposed index removals | Owner | Live model | Originating migration/evidence | Existed before TG19 | Classification | Production risk | Recommended resolution | Blocks TG19 |
|---|---:|---|---|---|---|---|---|---|---|---|
| `event_outbox` | 4 (table + 3 indexes) | idx_event_outbox_aggregate_id<br>idx_event_outbox_event_type<br>idx_event_outbox_unprocessed | Platform Foundation/Onboarding | `app/infrastructure/db/models/event_outbox.py` | `1d51109d8e2d_add_staff_bank_details_table.py; c43c9acdbc37_add_event_outbox_table.py; e5247a4461ec_create_event_outbox_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `notification_logs` | 6 (table + 5 indexes) | idx_notification_logs_created<br>idx_notification_logs_status<br>idx_notification_logs_tenant<br>idx_notification_logs_type<br>idx_notification_logs_user_sent | Notifications Platform | `app/infrastructure/db/models/notification_log.py` | `20260216_160000_add_push_notifications_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `notification_types` | 4 (table + 3 indexes) | idx_notification_types_active<br>idx_notification_types_category<br>idx_notification_types_code | Notifications Platform | `app/infrastructure/db/models/notification_type.py` | `20260216_161000_add_notification_types_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_appointment_rules` | 1 (table + 0 indexes) | — | Platform Foundation/Onboarding | `app/infrastructure/db/models/org_appointment_rule.py` | `0002_platform_master_data.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_audit_logs` | 3 (table + 2 indexes) | ix_org_audit_operation<br>ix_org_audit_org_created | Platform Foundation/Onboarding | `app/infrastructure/db/models/organization_audit_log.py` | `20260720_120000_tg19_platform_foundation.py` | No — introduced by TG19 | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_capabilities` | 3 (table + 2 indexes) | ix_org_capabilities_display_order<br>ix_org_capabilities_parent | Platform Capability/RBAC | `app/infrastructure/db/models/capability.py` | `mention: 20260713_090000_r5_capability_table_naming_alignment.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_capability_dependencies` | 2 (table + 1 indexes) | ix_org_capability_dependencies_depends_on | Platform Capability/RBAC | `app/infrastructure/db/models/capability_dependency.py` | `mention: 20260713_090000_r5_capability_table_naming_alignment.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_clinical_concept_context_mappings` | 2 (table + 1 indexes) | ix_org_clinical_concept_context_mappings_concept | Clinical Platform | `app/infrastructure/db/models/org_clinical_concept_context_mapping.py` | `20260717_100000_r6_clinical_concept_reference_model.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_clinical_concepts` | 1 (table + 0 indexes) | — | Clinical Platform | `app/infrastructure/db/models/org_clinical_concept.py` | `20260717_100000_r6_clinical_concept_reference_model.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_contact_verifications` | 4 (table + 3 indexes) | ix_contact_ver_contact<br>ix_contact_ver_expiry<br>ix_contact_ver_scope_status | Platform Foundation/Onboarding | `app/infrastructure/db/models/contact_verification.py` | `20260720_150000_contact_verification.py; 20260720_190000_add_manual_verification_decision_provenance.py` | No — introduced by TG19 | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_idempotency_records` | 3 (table + 2 indexes) | ix_org_idempotency_expires_at<br>ix_org_idempotency_lookup | Platform Foundation/Onboarding | `app/infrastructure/db/models/organization_idempotency_record.py` | `20260720_120000_tg19_platform_foundation.py` | No — introduced by TG19 | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_notification_events` | 4 (table + 3 indexes) | idx_org_notification_events_app_id<br>idx_org_notification_events_event_key<br>idx_org_notification_events_tenant_id | Notifications Platform | `app/infrastructure/db/models/org_notification_event.py` | `0014_update_notification_templates.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_organization_members` | 4 (table + 3 indexes) | ix_org_members_effective_tenant<br>ix_org_members_org_status<br>ix_org_members_user_status | Platform Foundation/Onboarding | `app/infrastructure/db/models/organization_member.py` | `20260720_120000_tg19_platform_foundation.py` | No — introduced by TG19 | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_organization_tenants` | 5 (table + 4 indexes) | ix_org_tenants_org_status<br>uq_org_tenant_active_identity<br>uq_org_tenant_active_owner<br>uq_org_tenant_active_pair | Platform Foundation/Onboarding | `app/infrastructure/db/models/organization_tenant.py` | `20260720_120000_tg19_platform_foundation.py` | No — introduced by TG19 | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_organizations` | 2 (table + 1 indexes) | ix_org_organizations_status | Platform Foundation/Onboarding | `app/infrastructure/db/models/organization.py` | `20260720_120000_tg19_platform_foundation.py` | No — introduced by TG19 | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_ownership_verifications` | 3 (table + 2 indexes) | ix_org_ownership_verification_expiry<br>ix_org_ownership_verification_scope | Platform Foundation/Onboarding | `app/infrastructure/db/models/ownership_verification.py` | `20260720_120000_tg19_platform_foundation.py` | No — introduced by TG19 | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_permissions` | 1 (table + 0 indexes) | — | RBAC | `app/infrastructure/db/models/org_permission.py` | `ae1f4047120f_create_org_rbac_catalog_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_platform_audit_logs` | 6 (table + 5 indexes) | ix_platform_audit_actor_created<br>ix_platform_audit_correlation<br>ix_platform_audit_event_created<br>ix_platform_audit_resource_created<br>ix_platform_audit_target_created | Platform Foundation/Onboarding | `app/infrastructure/db/models/platform_audit_log.py` | `20260720_170000_create_platform_audit_log.py` | No — introduced by TG19 | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_platform_capability_assignments` | 3 (table + 2 indexes) | ix_platform_capability_assignment_code_status<br>ix_platform_capability_assignment_user_status | Platform Capability/RBAC | `app/infrastructure/db/models/platform_capability_assignment.py` | `20260720_180000_create_platform_capability_assignments.py` | No — introduced by TG19 | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_role_permissions` | 1 (table + 0 indexes) | — | RBAC | `app/infrastructure/db/models/org_role_permission.py` | `ae1f4047120f_create_org_rbac_catalog_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_roles` | 1 (table + 0 indexes) | — | RBAC | `app/infrastructure/db/models/org_role.py` | `ae1f4047120f_create_org_rbac_catalog_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_setup_progress` | 1 (table + 0 indexes) | — | Platform Foundation/Onboarding | `app/infrastructure/db/models/org_setup_progress.py` | `0002_platform_master_data.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_subscription_plan_capabilities` | 1 (table + 0 indexes) | — | Platform Capability/RBAC | `app/infrastructure/db/models/subscription_plan_capability.py` | `mention: 20260713_090000_r5_capability_table_naming_alignment.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_subscription_plans` | 1 (table + 0 indexes) | — | Commercial/Billing | `app/infrastructure/db/models/org_subscription_plan.py` | `9ad6b47e9660_add_org_subscription_plans_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_subscriptions` | 4 (table + 3 indexes) | idx_org_subscriptions_next_billing<br>idx_org_subscriptions_razorpay<br>idx_org_subscriptions_tenant_status | Commercial/Billing | `app/infrastructure/db/models/org_subscription.py` | `phase4_subscription_billing_system.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_system_components` | 1 (table + 0 indexes) | — | Platform Foundation/Onboarding | `app/infrastructure/db/models/org_system_component.py` | `0002_platform_master_data.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_system_notifications` | 2 (table + 1 indexes) | idx_org_system_notifications_event_target | Notifications Platform | `app/infrastructure/db/models/org_broadcast_notification.py` | `mention: 0013_harden_tenant_application_lifecycle.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_template_capabilities` | 1 (table + 0 indexes) | — | Platform Capability/RBAC | `app/infrastructure/db/models/org_template_capability.py` | `20260712_150000_r5_template_capability.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_templates` | 1 (table + 0 indexes) | — | Platform Foundation/Onboarding | `app/infrastructure/db/models/org_template.py` | `0002_platform_master_data.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_tenant_applications` | 2 (table + 1 indexes) | idx_org_tenant_applications_tenant_id | Platform Foundation/Onboarding | `app/infrastructure/db/models/org_tenant_application.py` | `0002_platform_master_data.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_tenants` | 1 (table + 0 indexes) | — | Platform Foundation/Onboarding | `app/infrastructure/db/models/org_tenant.py` | `0001_initial_schema.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_trial_sessions` | 3 (table + 2 indexes) | idx_org_trial_sessions_expires_at<br>idx_org_trial_sessions_tenant_status | Commercial/Billing | `app/infrastructure/db/models/org_trial_session.py` | `phase4_subscription_billing_system.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_usage_tracking` | 3 (table + 2 indexes) | idx_org_usage_tracking_period_end<br>idx_org_usage_tracking_tenant_period | Commercial/Billing | `app/infrastructure/db/models/org_usage_tracking.py` | `phase4_subscription_billing_system.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `org_users` | 1 (table + 0 indexes) | — | Platform Foundation/Onboarding | `app/infrastructure/db/models/org_user.py` | `0001_initial_schema.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `staff_availability_overrides` | 4 (table + 3 indexes) | idx_staff_override_active<br>idx_staff_override_date_range<br>idx_staff_override_tenant_staff_date | Scheduling/Workforce | `app/infrastructure/db/models/staff_availability_override.py` | `20260216_170000_add_staff_availability_management.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `staff_availability_schedules` | 4 (table + 3 indexes) | idx_staff_availability_active<br>idx_staff_availability_effective_dates<br>idx_staff_availability_tenant_staff_day | Scheduling/Workforce | `app/infrastructure/db/models/staff_availability_schedule.py` | `20260216_170000_add_staff_availability_management.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `staff_bank_details` | 2 (table + 1 indexes) | idx_staff_bank_details_tenant_staff | Staff Platform | `app/infrastructure/db/models/staff_bank_details.py` | `1d51109d8e2d_add_staff_bank_details_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_appointments` | 4 (table + 3 indexes) | idx_appointments_doctor<br>idx_appointments_episode_id<br>idx_appointments_therapist_ids | Scheduling/Workforce | `app/infrastructure/db/models/tenant_appointment.py` | `0003_tenant_operations.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_audit_logs` | 9 (table + 8 indexes) | idx_audit_logs_action<br>idx_audit_logs_entity<br>idx_audit_logs_event_type<br>idx_audit_logs_performed_by_staff<br>idx_audit_logs_performed_by_user<br>idx_audit_logs_requires_audit<br>idx_audit_logs_tenant_performed_at<br>ix_tenant_audit_logs_tenant_id | Tenant Platform | `app/infrastructure/db/models/tenant_audit_log.py` | `84d21b2044d8_add_tenant_audit_logs_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_capabilities` | 2 (table + 1 indexes) | ix_tenant_capabilities_tenant_id | Platform Capability/RBAC | `app/infrastructure/db/models/tenant_capability.py` | `20260712_140000_r5_capability_entitlement.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_casesheet_contributions` | 3 (table + 2 indexes) | idx_casesheet_contributions_casesheet_id<br>idx_casesheet_contributions_visit_id | Clinical Platform | `app/infrastructure/db/models/tenant_casesheet_contribution.py` | `20260703_000004_create_tenant_casesheet_contributions.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_casesheet_templates` | 1 (table + 0 indexes) | — | Clinical Platform | `app/infrastructure/db/models/casesheet_template.py` | `mention: 1d51109d8e2d_add_staff_bank_details_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_casesheets` | 3 (table + 2 indexes) | idx_casesheets_episode_id<br>idx_casesheets_treatment_sheet_id | Clinical Platform | `app/infrastructure/db/models/tenant_casesheet.py` | `mention: 1d51109d8e2d_add_staff_bank_details_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_client_episodes` | 6 (table + 5 indexes) | idx_episodes_is_active<br>idx_episodes_status<br>idx_episodes_tenant_client<br>idx_episodes_tenant_client_start_date<br>idx_episodes_tenant_client_status | Clinical Platform | `app/infrastructure/db/models/tenant_client_episode.py` | `20260221_create_tenant_client_episodes.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_clients` | 1 (table + 0 indexes) | — | Clinical Platform | `app/infrastructure/db/models/tenant_client.py` | `0003_tenant_operations.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_clinical_services` | 3 (table + 2 indexes) | idx_clinical_services_tenant_id<br>idx_clinical_services_visit_id | Clinical Platform | `app/infrastructure/db/models/tenant_clinical_service.py` | `20260703_000005_create_tenant_clinical_services.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_features` | 2 (table + 1 indexes) | ix_tenant_features_tenant_id | Tenant Platform | `app/infrastructure/db/models/org_feature.py` | `mention: 1d51109d8e2d_add_staff_bank_details_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_idempotency_records` | 3 (table + 2 indexes) | idx_tenant_idempotency_expires_at<br>idx_tenant_idempotency_lookup | Platform Foundation/Onboarding | `app/infrastructure/db/models/platform_idempotency_record.py` | `20260712_000001_platform_idempotency_records.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_inventory` | 1 (table + 0 indexes) | — | Inventory | `app/infrastructure/db/models/tenant_inventory.py` | `mention: 1d51109d8e2d_add_staff_bank_details_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_inventory_alerts` | 6 (table + 5 indexes) | idx_tenant_inventory_alerts_batch<br>idx_tenant_inventory_alerts_item<br>idx_tenant_inventory_alerts_tenant<br>idx_tenant_inventory_alerts_type<br>idx_tenant_inventory_alerts_unack | Inventory | `app/infrastructure/db/models/tenant_inventory_alert.py` | `1d51109d8e2d_add_staff_bank_details_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_inventory_batches` | 5 (table + 4 indexes) | idx_tenant_inventory_batches_active<br>idx_tenant_inventory_batches_expiry<br>idx_tenant_inventory_batches_item<br>idx_tenant_inventory_batches_tenant | Inventory | `app/infrastructure/db/models/tenant_inventory_batch.py` | `1d51109d8e2d_add_staff_bank_details_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_inventory_movements` | 10 (table + 9 indexes) | idx_tenant_inventory_movements_batch<br>idx_tenant_inventory_movements_date<br>idx_tenant_inventory_movements_item<br>idx_tenant_inventory_movements_source<br>idx_tenant_inventory_movements_tenant<br>idx_tenant_inventory_movements_type<br>ix_tim_tenant_correlation_source_type<br>ix_tim_tenant_source_id_source_type_correlation<br>uq_tim_tenant_correlation_source_type | Inventory | `app/infrastructure/db/models/tenant_inventory_movement.py` | `1d51109d8e2d_add_staff_bank_details_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_invoice_lines` | 2 (table + 1 indexes) | idx_invoice_lines_clinical_service_id | Commercial/Billing | `app/infrastructure/db/models/tenant_invoice_line.py` | `7c93b2118d3b_0019_add_finance_and_visits_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_invoices` | 2 (table + 1 indexes) | idx_tenant_invoices_tenant_number | Commercial/Billing | `app/infrastructure/db/models/tenant_invoice.py` | `7c93b2118d3b_0019_add_finance_and_visits_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_operating_hours` | 1 (table + 0 indexes) | — | Tenant Platform | `app/infrastructure/db/models/tenant_operating_hour.py` | `0003_tenant_operations.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_payments` | 1 (table + 0 indexes) | — | Commercial/Billing | `app/infrastructure/db/models/tenant_payment.py` | `7c93b2118d3b_0019_add_finance_and_visits_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_permissions` | 1 (table + 0 indexes) | — | RBAC | `app/infrastructure/db/models/tenant_permission.py` | `950b1cd59910_0004_tenant_authorization.py; 957424e3e211_refactor_tenant_permissions_to_.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_prescriptions` | 3 (table + 2 indexes) | idx_prescriptions_episode_id<br>idx_prescriptions_visit_id | Clinical Platform | `app/infrastructure/db/models/tenant_prescription.py` | `0003_tenant_operations.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_print_settings` | 1 (table + 0 indexes) | — | Tenant Platform | `app/infrastructure/db/models/clinic_print_settings.py` | `c12d5e476ec8_add_clinical_documents_system.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_role_permissions` | 1 (table + 0 indexes) | — | RBAC | `app/infrastructure/db/models/tenant_role_permission.py` | `950b1cd59910_0004_tenant_authorization.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_roles` | 3 (table + 2 indexes) | ix_tenant_roles_org_role<br>ix_tenant_roles_tenant | RBAC | `app/infrastructure/db/models/tenant_role.py` | `950b1cd59910_0004_tenant_authorization.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_rooms` | 1 (table + 0 indexes) | — | Tenant Platform | `app/infrastructure/db/models/tenant_room.py` | `0003_tenant_operations.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_staff` | 4 (table + 3 indexes) | uq_tenant_staff_tenant_email<br>uq_tenant_staff_tenant_org_user<br>uq_tenant_staff_tenant_phone | Staff Platform | `app/infrastructure/db/models/tenant_staff.py` | `0003_tenant_operations.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_staff_certificates` | 1 (table + 0 indexes) | — | Staff Platform | `app/infrastructure/db/models/tenant_staff_certificate.py` | `6cac8419411b_add_staff_module_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_staff_kyc_documents` | 1 (table + 0 indexes) | — | Staff Platform | `app/infrastructure/db/models/tenant_staff_kyc_document.py` | `6cac8419411b_add_staff_module_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_staff_leaves` | 1 (table + 0 indexes) | — | Staff Platform | `app/infrastructure/db/models/tenant_staff_leave.py` | `6cac8419411b_add_staff_module_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_staff_notification_tokens` | 1 (table + 0 indexes) | — | Staff Platform | `app/infrastructure/db/models/tenant_staff_notification_token.py` | `9592349a956a_add_staff_notification_tokens_table.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_therapy_usables` | 6 (table + 5 indexes) | ix_tenant_therapy_usables_tenant_inventory_item<br>ix_tenant_therapy_usables_tenant_treatment_active<br>ix_tenant_therapy_usables_tenant_treatment_material_code<br>uq_tenant_therapy_usables_tenant_treatment_code_category<br>uq_tenant_therapy_usables_tenant_treatment_inventory_item | Clinical Platform | `app/infrastructure/db/models/tenant_therapy_usables.py` | `20260320_100000_add_tenant_therapy_usables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_treatment_clinical_reviews` | 3 (table + 2 indexes) | ix_ttcr_open_review<br>ix_ttcr_sheet_created | Clinical Platform | `app/infrastructure/db/models/tenant_treatment_clinical_review.py` | `20260711_120000_r4_treatment_lifecycle_ownership.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_treatment_material_usage` | 8 (table + 7 indexes) | ix_ttmu_tenant_client<br>ix_ttmu_tenant_created_at<br>ix_ttmu_tenant_row_is_deleted<br>ix_ttmu_tenant_treatment_sheet<br>uq_ttmu_tenant_correlation_id<br>uq_ttmu_tenant_row_inventory_item<br>uq_ttmu_tenant_row_material_code | Clinical Platform | `app/infrastructure/db/models/tenant_treatment_material_usage.py` | `6cac8419411b_add_staff_module_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_treatment_sessions` | 1 (table + 0 indexes) | — | Clinical Platform | `app/infrastructure/db/models/tenant_treatment_session.py` | `0003_tenant_operations.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_treatment_sheet_rows` | 6 (table + 5 indexes) | ix_ttsr_assigned_staff_scheduled_date<br>ix_ttsr_id_hash<br>ix_ttsr_sheet_sched<br>ix_ttsr_therapist_daily<br>uq_sheet_rows_appointment_id | Clinical Platform | `app/infrastructure/db/models/treatment_sheet_row.py` | `mention: 20260625_000001_allow_scheduled_treatment_sheet_rows.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_treatment_sheets` | 6 (table + 5 indexes) | idx_treatment_sheets_episode_id<br>ix_tts_on_hold_expiry<br>ix_tts_overdue_orders<br>ix_tts_released_at<br>ix_tts_tenant_state_order | Clinical Platform | `app/infrastructure/db/models/tenant_treatment_sheet.py` | `mention: 20260228_130000_remove_treatment_proposals.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_treatments` | 1 (table + 0 indexes) | — | Clinical Platform | `app/infrastructure/db/models/tenant_treatment.py` | `0003_tenant_operations.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_user_role_history` | 2 (table + 1 indexes) | ix_tenant_user_role_history_tenant | RBAC | `app/infrastructure/db/models/tenant_user_role_history.py` | `950b1cd59910_0004_tenant_authorization.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_user_roles` | 3 (table + 2 indexes) | ix_tenant_user_roles_tenant<br>ix_tenant_user_roles_tenant_user_role | RBAC | `app/infrastructure/db/models/tenant_user_role.py` | `950b1cd59910_0004_tenant_authorization.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_users` | 3 (table + 2 indexes) | ix_tenant_users_tenant<br>ix_tenant_users_user | RBAC | `app/infrastructure/db/models/tenant_user.py` | `950b1cd59910_0004_tenant_authorization.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `tenant_visits` | 3 (table + 2 indexes) | idx_visits_episode_id<br>uq_visits_appointment_id_not_null | Clinical Platform | `app/infrastructure/db/models/tenant_visit.py` | `7c93b2118d3b_0019_add_finance_and_visits_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `user_notification_preferences` | 3 (table + 2 indexes) | idx_user_notification_prefs_type<br>idx_user_notification_prefs_user_tenant | Notifications Platform | `app/infrastructure/db/models/user_notification_preference.py` | `20260216_160000_add_push_notifications_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |
| `user_push_tokens` | 3 (table + 2 indexes) | idx_user_push_tokens_last_used<br>idx_user_push_tokens_user_active | Notifications Platform | `app/infrastructure/db/models/user_push_token.py` | `20260216_160000_add_push_notifications_tables.py` | Yes | `TG19_REGRESSION` | Critical if generated/applied; no runtime drift shown | Restore deterministic complete model registration; rerun comparison | Yes |

## 6. Highest-risk Findings

1. **Destructive autogenerate risk — Critical.** A generated revision based on
   the current metadata would attempt to drop the entire application schema.
   Such a revision must never be generated, reviewed, or applied.
2. **TG19 tables are not registered — High.** Organization membership,
   association, audit, idempotency, contact/ownership verification, Platform
   Audit, and capability assignment models are absent from Alembic metadata.
3. **Older metadata debt is masked — High.** Restoring the former partial import
   list is insufficient: the ancestor already failed on an unresolved
   `org_staff` foreign-key target.
4. **Runtime schema remains intact — Low immediate runtime risk.** Fresh upgrade,
   TG19 PostgreSQL integration, downgrade/re-upgrade, constraints, indexes,
   concurrency, rollback, and the complete regression suite passed. The danger
   is migration-authoring/release governance, not observed runtime data loss.

## 7. Required Remediation and Ownership

### TG19 correction before final acceptance

Owner: **Platform Foundation + Database/Migrations**

1. Introduce one deterministic model-registration entry point that imports every
   live model required by Alembic.
2. Invoke it in `migrations/env.py` before reading `Base.metadata`.
3. Add a fail-closed metadata guard covering at least the nine TG19 tables and a
   non-trivial total table count.
4. Add a focused test that a fresh database at head does not produce destructive
   removal operations for TG19 tables.
5. Rerun `alembic check` on a fresh PostgreSQL database and inventory the
   residual, now-real differences.

No new product or constitutional decision is required for this correction.

### Separately owned schema-reconciliation initiative

Owner: **Database/Migrations**, with module owners for Notifications, Clinical,
Scheduling, Inventory, Billing, Staff, RBAC, and Onboarding.

After complete registration is restored, resolve the ancestor's
`org_staff` foreign-key metadata dependency and classify every residual
autogenerate difference. Do not mix those unrelated corrections into TG19.

## 8. Release-gate Decision

A formal TG19 exception is **not justified for the current state** because the
blocking comparison failure was introduced by TG19 and has a bounded correction.
After model registration is fixed, an exception may be considered only for
proven residual pre-existing differences, supported by a new clean inventory.

**TG19 final acceptance remains blocked until the empty Alembic metadata
registration regression is corrected and a fresh `alembic check` no longer
proposes destructive removal of TG19 tables.**

## 9. Post-correction Evidence — 2026-07-21

This section supersedes §8's pre-correction release-gate decision.

The TG19 correction restores deterministic discovery and import of every module
in `app.infrastructure.db.models`, validates every discovered declarative table
against `Base.metadata`, and explicitly requires the nine TG19 Platform
Foundation tables. The guard uses table identity, not a hardcoded table count,
and fails before Alembic comparison when discovery or required registration is
incomplete.

Fresh PostgreSQL verification confirms:

- the full migration chain reaches the single head `20260720_190000`;
- downgrade to `20260720_120000` and re-upgrade to head succeed;
- the former 80 table-removal and 146 index-removal operations are eliminated;
- no residual comparison operation references a TG19 Platform Foundation table.

Direct `alembic check` now stops on one pre-existing metadata defect:
`tenant_treatment_material_usage.deleted_by_staff_id` targets absent metadata
table `org_staff`. A complete registry scan finds no second unresolved foreign
key. An analysis-only comparison that suppresses only that known constraint in
memory—without changing source or schema—accounts for all 217 residual
operations:

| Classification | Operations | Evidence |
|---|---:|---|
| `PRE_EXISTING_MISSING_MIGRATION` | 6 | Model-only tables: `bulk_import_jobs`, `bulk_import_staging`, `tenant_appointment_rules`, `feedback_requests`, `patient_feedback`, and `therapist_feedback` |
| `REFLECTION_OR_NAMING_DIFFERENCE` | 195 | 99 column-comment changes, 5 table-comment removals, 80 index removals, and 11 index additions |
| `STALE_MODEL_METADATA` | 16 | Event-outbox nullable/type differences (2); tenant-inventory model-only columns (8); treatment-material nullable/FK/column differences (4); treatment-session column difference (1); notification-preference constraint difference (1) |
| **Total** | **217** | No TG19 table is implicated |

Additional pre-existing metadata diagnostics are the unresolved `org_staff`
foreign-key target and a cycle warning between `tenant_casesheets` and
`tenant_treatment_sheets`. They predate TG19 and belong to the separately
owned schema-reconciliation initiative.

**TG19 metadata-registry regression is corrected. TG19 final acceptance may
proceed; historical repository metadata debt remains separately blocked from a
repository-wide clean `alembic check`.**
