# Progressive Experience Migration Fixtures

Date: 2026-07-11

## Purpose

This document records migration-fixture expectations for Progressive Experience planning. No migrations are created or modified by this checkpoint.

## Current Fixture Status

No Progressive Experience-specific migration fixtures were found in the ignored Kiro spec directory during reconciliation.

## Recovery Checkpoint Requirements

Before any future onboarding migration or data-shape change is implemented, the recovery branch must define fixtures for:

- onboarding/provisional tenant with `tenant_id` available through `/auth/me`;
- live tenant with `tenant_id` available through `/auth/me`;
- step submission retry using the same `Idempotency-Key`;
- concurrent duplicate step submission using the same `Idempotency-Key`;
- cross-tenant submission attempt where JWT tenant and route/header tenant disagree;
- Hindi localization key audit for Progressive Experience copy.

## Current Decision

No database migration is authorized by this documentation-governance task. Fixture work remains pending until the Progressive Experience Recovery Checkpoint becomes GO and an implementation phase is explicitly started.
