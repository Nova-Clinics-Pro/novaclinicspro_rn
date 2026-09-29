export const STEP_REVISION_CONTRACT_V1 = 'step-rev-v1' as const;
export const STEP_CONFLICT_ERROR_CODE = 'onboarding.step_revision_conflict' as const;

const STEP_REVISION_PATTERN = /^step-rev-v1:[0-9a-f]{64}$/;
const CAPABILITY_REVISION_PATTERN = /^cap-v1:[0-9a-f]{64}$/;

export type StepConflictClassification = 'STALE_REVISION';

export interface StepProjectionIdentity {
  readonly templateVersion: string;
  readonly capabilityRevision: string;
}

export interface AuthoritativeStepRevision {
  readonly contractVersion: typeof STEP_REVISION_CONTRACT_V1;
  readonly value: string;
}

export interface AuthoritativeStepUpdateEvidence {
  readonly tenantId: string;
  readonly stepCode: string;
  readonly revision: AuthoritativeStepRevision;
  readonly updatedAt: Date;
  readonly projectionIdentity: StepProjectionIdentity;
}

export interface StaleRevisionConflict {
  readonly classification: StepConflictClassification;
  readonly stepCode: string;
  readonly currentRevision: AuthoritativeStepRevision;
  readonly projectionIdentity: StepProjectionIdentity;
  readonly messageToken: string;
}

export interface RevisionAwareMutationExpectation {
  readonly expectedRevision: AuthoritativeStepRevision;
}

export const createRevisionAwareMutationExpectation = (
  expectedRevision: AuthoritativeStepRevision
): RevisionAwareMutationExpectation =>
  Object.freeze({ expectedRevision });

export type StepConflictFailureKind =
  | 'STALE_REVISION'
  | 'MALFORMED_CONFLICT'
  | 'UNSUPPORTED_CONTRACT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TENANT_MISMATCH'
  | 'ORGANIZATION_MISMATCH'
  | 'BACKEND_FAILURE';

export class StepConflictError extends Error {
  constructor(
    readonly kind: StepConflictFailureKind,
    readonly code: string,
    readonly messageToken: string,
    readonly retryable: boolean,
    readonly conflict: StaleRevisionConflict | null = null
  ) {
    super(messageToken);
    this.name = 'StepConflictError';
  }
}

const required = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim() === value;

export const createAuthoritativeStepRevision = (
  value: unknown
): AuthoritativeStepRevision => {
  if (typeof value !== 'string' || !STEP_REVISION_PATTERN.test(value)) {
    throw new StepConflictError(
      'UNSUPPORTED_CONTRACT',
      'onboarding.step_revision_contract_unsupported',
      'errors.onboarding.stepRevisionContractUnsupported',
      false
    );
  }
  return Object.freeze({
    contractVersion: STEP_REVISION_CONTRACT_V1,
    value,
  });
};

export const createStepProjectionIdentity = (
  templateVersion: unknown,
  capabilityRevision: unknown
): StepProjectionIdentity => {
  if (
    !required(templateVersion) ||
    typeof capabilityRevision !== 'string' ||
    !CAPABILITY_REVISION_PATTERN.test(capabilityRevision)
  ) {
    throw new StepConflictError(
      'UNSUPPORTED_CONTRACT',
      'onboarding.step_projection_contract_unsupported',
      'errors.onboarding.stepProjectionContractUnsupported',
      false
    );
  }
  return Object.freeze({ templateVersion, capabilityRevision });
};

export const createAuthoritativeStepUpdateEvidence = (input: {
  tenantId: unknown;
  stepCode: unknown;
  revision: unknown;
  updatedAt: unknown;
  templateVersion: unknown;
  capabilityRevision: unknown;
}): AuthoritativeStepUpdateEvidence => {
  const hasExplicitTimezone =
    input.updatedAt instanceof Date ||
    (typeof input.updatedAt === 'string' &&
      /(Z|[+-]\d{2}:\d{2})$/i.test(input.updatedAt));
  const updatedAt =
    typeof input.updatedAt === 'string' || input.updatedAt instanceof Date
      ? new Date(input.updatedAt)
      : new Date(Number.NaN);
  if (
    !required(input.tenantId) ||
    !required(input.stepCode) ||
    !hasExplicitTimezone ||
    Number.isNaN(updatedAt.getTime()) ||
    input.updatedAt === null
  ) {
    throw new StepConflictError(
      'UNSUPPORTED_CONTRACT',
      'onboarding.step_evidence_contract_unsupported',
      'errors.onboarding.stepEvidenceContractUnsupported',
      false
    );
  }
  return Object.freeze({
    tenantId: input.tenantId,
    stepCode: input.stepCode,
    revision: createAuthoritativeStepRevision(input.revision),
    updatedAt,
    projectionIdentity: createStepProjectionIdentity(
      input.templateVersion,
      input.capabilityRevision
    ),
  });
};

export const createStaleRevisionConflict = (input: {
  classification: unknown;
  stepCode: unknown;
  currentRevision: unknown;
  templateVersion: unknown;
  capabilityRevision: unknown;
  messageToken: unknown;
}): StaleRevisionConflict => {
  if (
    input.classification !== 'STALE_REVISION' ||
    !required(input.stepCode) ||
    !required(input.messageToken)
  ) {
    throw new StepConflictError(
      'MALFORMED_CONFLICT',
      'onboarding.step_revision_conflict_malformed',
      'errors.onboarding.stepRevisionConflictMalformed',
      false
    );
  }
  return Object.freeze({
    classification: input.classification,
    stepCode: input.stepCode,
    currentRevision: createAuthoritativeStepRevision(input.currentRevision),
    projectionIdentity: createStepProjectionIdentity(
      input.templateVersion,
      input.capabilityRevision
    ),
    messageToken: input.messageToken,
  });
};

export interface DraftRevisionEvidence {
  readonly organizationId: string;
  readonly tenantId: string;
  readonly stepCode: string;
  readonly revision: AuthoritativeStepRevision;
  readonly projectionIdentity: StepProjectionIdentity;
}

export const createDraftRevisionEvidence = (input: {
  organizationId: unknown;
  tenantId: unknown;
  stepCode: unknown;
  revision: unknown;
  templateVersion: unknown;
  capabilityRevision: unknown;
}): DraftRevisionEvidence => {
  if (
    !required(input.organizationId) ||
    !required(input.tenantId) ||
    !required(input.stepCode)
  ) {
    throw new StepConflictError(
      'UNSUPPORTED_CONTRACT',
      'onboarding.draft_revision_scope_unsupported',
      'errors.onboarding.draftRevisionScopeUnsupported',
      false
    );
  }
  return Object.freeze({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    stepCode: input.stepCode,
    revision: createAuthoritativeStepRevision(input.revision),
    projectionIdentity: createStepProjectionIdentity(
      input.templateVersion,
      input.capabilityRevision
    ),
  });
};

export interface DraftConflictFacts {
  readonly localDraftExists: boolean;
  readonly observedRevision: AuthoritativeStepRevision | null;
  readonly currentRevision: AuthoritativeStepRevision;
  readonly revisionsMatch: boolean | null;
  readonly projectionMatches: boolean | null;
  readonly transportConflictReceived: boolean;
  readonly legacyOrMissingEvidence: boolean;
}

export const deriveDraftConflictFacts = (input: {
  currentOrganizationId: string;
  localDraftExists: boolean;
  localEvidence: DraftRevisionEvidence | null;
  currentEvidence: AuthoritativeStepUpdateEvidence;
  transportConflict?: StaleRevisionConflict | null;
}): DraftConflictFacts => {
  const localEvidence = input.localEvidence;
  const scopeMatches = Boolean(
    localEvidence &&
      localEvidence.organizationId === input.currentOrganizationId &&
      localEvidence.tenantId === input.currentEvidence.tenantId &&
      localEvidence.stepCode === input.currentEvidence.stepCode
  );
  const projectionMatches = localEvidence
    ? scopeMatches &&
      localEvidence.projectionIdentity.templateVersion ===
        input.currentEvidence.projectionIdentity.templateVersion &&
      localEvidence.projectionIdentity.capabilityRevision ===
        input.currentEvidence.projectionIdentity.capabilityRevision
    : null;
  return Object.freeze({
    localDraftExists: input.localDraftExists,
    observedRevision: localEvidence?.revision ?? null,
    currentRevision: input.currentEvidence.revision,
    revisionsMatch: localEvidence
      ? scopeMatches &&
        localEvidence.revision.value === input.currentEvidence.revision.value
      : null,
    projectionMatches,
    transportConflictReceived: Boolean(input.transportConflict),
    legacyOrMissingEvidence: input.localDraftExists && localEvidence === null,
  });
};
