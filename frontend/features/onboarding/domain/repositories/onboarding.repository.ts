/**
 * Onboarding Repository Interface
 * Defines the contract for onboarding data operations
 */

import {
  ApplicationDetailResponse,
  ValidationReportResponse,
  ApplicationImprovementRequest,
  ApplicationImprovementResponse,
  DemoCreateRequest,
  DemoCreateResponse,
  DemoStatusResponse,
  SetupWizardContextResponse,
  SetupWizardProgressResponse,
} from '../../data/models/onboarding.dtos';
import {
  AuthOrganizationContext,
  BringClinicInput,
  ClinicEntryResult,
  ContactVerificationResult,
  EffectiveTenantResult,
  NewClinicInput,
  InitialOrganizationResult,
  OwnershipStatusResult,
} from '../clinic-entry';
import {
  WorkspacePreparation,
  WorkspacePreparationError,
} from '../entities/workspace-preparation.entity';
import { JourneyVisibilityProjection } from '../entities/journey-visibility.entity';
import { ReadyToStart } from '../entities/ready-to-start.entity';

export interface IJourneyVisibilityRepository {
  getJourneyVisibility(tenantId: string): Promise<JourneyVisibilityProjection>;
}

export interface IReadyToStartRepository {
  getReadyToStart(tenantId: string, signal?: AbortSignal): Promise<ReadyToStart>;
}

export interface IOnboardingRepository {
  getApplicationDetail(applicationId: string): Promise<ApplicationDetailResponse>;
  getValidationReport(applicationId: string): Promise<ValidationReportResponse>;
  improveApplication(
    applicationId: string, 
    data: ApplicationImprovementRequest
  ): Promise<ApplicationImprovementResponse>;
  resubmitApplication(applicationId: string): Promise<ApplicationDetailResponse>;
  createDemoTenant(data: DemoCreateRequest): Promise<DemoCreateResponse>;
  getDemoStatus(demoTenantId: string): Promise<DemoStatusResponse>;
  transitionDemoToLive(demoTenantId: string): Promise<{ tenant_id: string; tenant_url: string }>;
  getSetupWizardContext(applicationId: string): Promise<SetupWizardContextResponse>;
  getSetupWizardProgress(applicationId: string): Promise<SetupWizardProgressResponse>;
  completeSetupWizard(applicationId: string): Promise<{ tenant_id: string }>;
  getOrganizationContext(): Promise<AuthOrganizationContext>;
  createInitialOrganization(displayName: string): Promise<InitialOrganizationResult>;
  requestContactVerification(
    organizationId: string,
    contactKind: 'email' | 'mobile',
    contactValue: string,
    intendedOperation: 'clinic_entry.create.v1' | 'clinic_entry.associate.v1',
    idempotencyKey: string
  ): Promise<ContactVerificationResult>;
  getContactVerificationStatus(
    organizationId: string,
    evidenceId: string
  ): Promise<ContactVerificationResult>;
  getOwnershipStatus(
    organizationId: string,
    ownershipReference: string
  ): Promise<OwnershipStatusResult>;
  createClinic(
    organizationId: string,
    input: NewClinicInput,
    evidenceReference: string,
    idempotencyKey: string
  ): Promise<ClinicEntryResult>;
  associateClinic(
    organizationId: string,
    input: BringClinicInput,
    evidenceReference: string,
    idempotencyKey: string
  ): Promise<ClinicEntryResult>;
  selectEffectiveTenant(
    organizationId: string,
    tenantId: string,
    idempotencyKey: string
  ): Promise<EffectiveTenantResult>;
  refreshEffectiveTenant(organizationId: string): Promise<EffectiveTenantResult>;
  ensureWorkspacePreparation(tenantId: string): Promise<WorkspacePreparation>;
  getWorkspacePreparation(tenantId: string): Promise<WorkspacePreparation>;
  retryWorkspacePreparation(
    tenantId: string,
    aggregateVersion: number,
    idempotencyKey: string
  ): Promise<WorkspacePreparation>;
  getJourneyVisibility(tenantId: string): Promise<JourneyVisibilityProjection>;
  getReadyToStart(tenantId: string, signal?: AbortSignal): Promise<ReadyToStart>;
}

export type OnboardingRepositoryError = WorkspacePreparationError;
