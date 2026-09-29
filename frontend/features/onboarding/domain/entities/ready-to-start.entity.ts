export const READY_TO_START_CONTRACT_V1 = 'ready_to_start_v1' as const;

export type ReadinessState =
  | 'READY'
  | 'NOT_READY'
  | 'EVALUATING'
  | 'UNKNOWN'
  | 'UNAVAILABLE'
  | 'STALE';

export type ChecklistItemStatus =
  | 'COMPLETE'
  | 'BLOCKED'
  | 'ADVISORY'
  | 'EVALUATING'
  | 'UNKNOWN'
  | 'UNAVAILABLE'
  | 'STALE';

export type ReadinessClassification = 'BLOCKER' | 'ADVISORY';
export type ReadinessProviderOutcome = 'SATISFIED' | 'BLOCKER' | 'ADVISORY';
export type NextActionKind = 'NAVIGATE' | 'REFRESH' | 'RETRY' | 'CONTACT_SUPPORT';

export interface JourneyProjectionIdentity {
  readonly templateVersion: string;
  readonly capabilityRevision: string;
}

export interface ReadinessIdentity {
  readonly readinessContractVersion: typeof READY_TO_START_CONTRACT_V1;
  readonly tenantId: string;
  readonly journeyProjectionIdentity: JourneyProjectionIdentity;
  readonly providerSetRevision: string;
  readonly evidenceRevision: string;
}

export interface NextAction {
  readonly actionId: string;
  readonly labelToken: string;
  readonly ownerId: string;
  readonly kind: NextActionKind;
  readonly authorizationRequirement: string;
  readonly targetId: string | null;
}

export interface ChecklistItem {
  readonly providerId: string;
  readonly itemId: string;
  readonly itemVersion: string;
  readonly titleToken: string;
  readonly explanationToken: string;
  readonly status: ChecklistItemStatus;
  readonly classification: ReadinessClassification | null;
  readonly evidenceTimestamp: string;
  readonly order: number;
  readonly applicable: boolean;
  readonly nextAction: NextAction | null;
}

export interface Blocker extends ChecklistItem {
  readonly classification: 'BLOCKER';
}

export interface Advisory extends ChecklistItem {
  readonly classification: 'ADVISORY';
}

export interface ReadinessProvider {
  readonly providerId: string;
  readonly providerVersion: string;
  readonly providerOrder: number;
  readonly applicable: boolean;
  readonly state: ReadinessState;
  readonly outcome: ReadinessProviderOutcome;
  readonly evidenceRevision: string;
  readonly observedAt: string;
  readonly severity: string;
  readonly explanationToken: string;
  readonly nextAction: NextAction | null;
}

export interface ReadyToStart {
  readonly identity: ReadinessIdentity;
  readonly state: ReadinessState;
  readonly providers: readonly ReadinessProvider[];
  readonly checklist: readonly ChecklistItem[];
  readonly blockers: readonly Blocker[];
  readonly advisories: readonly Advisory[];
  readonly evaluatedAt: string;
  readonly authorizesHandoff: boolean;
}

export type ReadyToStartFailureKind =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TENANT_MISMATCH'
  | 'ORGANIZATION_MISMATCH'
  | 'UNSUPPORTED_CONTRACT'
  | 'STALE_PROJECTION'
  | 'READINESS_UNAVAILABLE'
  | 'INVALID_AGGREGATE'
  | 'BACKEND_FAILURE';

export class ReadyToStartError extends Error {
  constructor(
    readonly kind: ReadyToStartFailureKind,
    readonly code: string,
    readonly messageToken: string,
    readonly retryable: boolean
  ) {
    super(messageToken);
    this.name = 'ReadyToStartError';
  }
}

export const isSameReadinessIdentity = (
  left: ReadinessIdentity,
  right: ReadinessIdentity
): boolean =>
  left.readinessContractVersion === right.readinessContractVersion &&
  left.tenantId === right.tenantId &&
  left.journeyProjectionIdentity.templateVersion ===
    right.journeyProjectionIdentity.templateVersion &&
  left.journeyProjectionIdentity.capabilityRevision ===
    right.journeyProjectionIdentity.capabilityRevision &&
  left.providerSetRevision === right.providerSetRevision &&
  left.evidenceRevision === right.evidenceRevision;
