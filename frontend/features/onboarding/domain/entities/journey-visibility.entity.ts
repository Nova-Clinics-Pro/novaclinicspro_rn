export const JOURNEY_VISIBILITY_CONTRACT_V1 = '1.0' as const;

export type JourneyVisibilityProgress = 'INCOMPLETE' | 'COMPLETED';

export interface JourneyVisibilityProjectionIdentity {
  readonly contractVersion: typeof JOURNEY_VISIBILITY_CONTRACT_V1;
  readonly templateVersion: string;
  readonly capabilityRevision: string;
  readonly tenantId: string;
}

export interface JourneyVisibilityStep {
  readonly stepId: string;
  readonly order: number;
  readonly visibility: 'VISIBLE';
  readonly progress: JourneyVisibilityProgress;
}

export interface JourneyRequirement {
  readonly requirementId: string;
  readonly satisfied: boolean;
  readonly currentValue: unknown;
  readonly requiredValue: unknown;
  readonly titleToken: string | null;
  readonly helpToken: string | null;
  readonly blockerToken: string | null;
  readonly correctiveAction: JourneyCorrectiveAction | null;
}

export interface JourneyCorrectiveAction {
  readonly kind: 'NAVIGATE';
  readonly target: string;
  readonly destination: string;
  readonly requiredParams: readonly string[];
  readonly labelToken: string;
  readonly availability: 'AVAILABLE' | 'UNAVAILABLE';
  readonly fallbackToken: string;
}

export interface JourneyResolvedStep {
  readonly stepId: string;
  readonly order: number;
  readonly rendererKey: string | null;
  readonly applicable: boolean;
  readonly required: boolean;
  readonly state: 'COMPLETE' | 'BLOCKED' | 'NOT_APPLICABLE';
  readonly titleToken: string | null;
  readonly helpToken: string | null;
  readonly requirements: readonly JourneyRequirement[];
  readonly blockers: readonly JourneyRequirement[];
  readonly correctiveActions: readonly JourneyCorrectiveAction[];
  readonly presentation: Readonly<Record<string, unknown>>;
}

export interface JourneyVisibilityProjection {
  readonly identity: JourneyVisibilityProjectionIdentity;
  readonly projectedAt: Date;
  readonly projectionRevision: string;
  readonly visibleSteps: readonly JourneyVisibilityStep[];
  readonly resolvedSteps: readonly JourneyResolvedStep[];
}

export type JourneyVisibilityFailureKind =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TENANT_MISMATCH'
  | 'PROJECTION_UNAVAILABLE'
  | 'CONTRACT_MISMATCH'
  | 'BACKEND_FAILURE';

export class JourneyVisibilityError extends Error {
  constructor(
    readonly kind: JourneyVisibilityFailureKind,
    readonly code: string,
    readonly messageToken: string,
    readonly retryable: boolean
  ) {
    super(messageToken);
    this.name = 'JourneyVisibilityError';
  }
}

export const isSameJourneyVisibilityProjectionIdentity = (
  left: JourneyVisibilityProjectionIdentity,
  right: JourneyVisibilityProjectionIdentity
): boolean =>
  left.contractVersion === right.contractVersion &&
  left.templateVersion === right.templateVersion &&
  left.capabilityRevision === right.capabilityRevision &&
  left.tenantId === right.tenantId;
