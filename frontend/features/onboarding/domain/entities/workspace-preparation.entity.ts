export const WORKSPACE_PREPARATION_CONTRACT_V1 = 'workspace_preparation_v1' as const;

export type WorkspacePreparationState =
  | 'PENDING'
  | 'PREPARING'
  | 'PERSONALIZATION_AVAILABLE'
  | 'RETRYABLE_FAILURE'
  | 'TERMINAL_FAILURE';

export const WORKSPACE_PREPARATION_UNIT_ORDER = Object.freeze([
  'TENANT_FOUNDATION',
  'ACCESS_FOUNDATION',
  'ONBOARDING_FOUNDATION',
  'PERSONALIZATION_HANDOFF',
] as const);

export type WorkspacePreparationUnitCode =
  (typeof WORKSPACE_PREPARATION_UNIT_ORDER)[number];

export type WorkspacePreparationNextAction =
  | 'START'
  | 'WAIT'
  | 'REFRESH'
  | 'RETRY'
  | 'ENTER_PERSONALIZATION'
  | 'CONTACT_SUPPORT';

export interface WorkspacePreparationProgress {
  readonly completed: number;
  readonly total: number;
  readonly indeterminate: boolean;
}

export interface WorkspacePreparationUnit {
  readonly code: WorkspacePreparationUnitCode;
  readonly outcome: string;
  readonly evidenceVersion: string;
  readonly attempt: number;
  readonly observedAt: Date;
  readonly recordedAt: Date;
}

export interface WorkspacePreparationRetryInformation {
  readonly available: boolean;
  readonly exhausted: boolean;
  readonly used: number;
  readonly maximum: number;
  readonly remaining: number;
}

export interface WorkspacePreparationFailureInformation {
  readonly kind: 'RETRYABLE' | 'TERMINAL' | 'NONE';
  readonly reasonCode: string | null;
  readonly messageToken: string | null;
}

export interface WorkspacePreparationProgressSummary {
  readonly completedUnits: readonly WorkspacePreparationUnitCode[];
  readonly remainingUnits: readonly WorkspacePreparationUnitCode[];
  readonly currentUnit: WorkspacePreparationUnitCode | null;
  readonly completed: number;
  readonly total: number;
  readonly percentage: number;
  readonly indeterminate: boolean;
}

export interface WorkspacePreparation {
  readonly contractVersion: typeof WORKSPACE_PREPARATION_CONTRACT_V1;
  readonly runId: string;
  readonly state: WorkspacePreparationState;
  readonly aggregateVersion: number;
  readonly progress: WorkspacePreparationProgress;
  readonly units: readonly WorkspacePreparationUnit[];
  readonly reasonCode: string | null;
  readonly retryAllowed: boolean;
  readonly userRetryCount: number;
  readonly maxUserRetries: number;
  readonly nextAction: WorkspacePreparationNextAction;
  readonly refreshAfterSeconds: number | null;
  readonly supportCorrelationId: string;
  readonly updatedAt: Date;
}

export interface WorkspacePreparationOrchestrationState {
  readonly lifecycle: WorkspacePreparationState;
  readonly progress: WorkspacePreparationProgressSummary;
  readonly retry: WorkspacePreparationRetryInformation;
  readonly failure: WorkspacePreparationFailureInformation;
  readonly nextAction: WorkspacePreparationNextAction;
  readonly personalizationAvailable: boolean;
  readonly aggregateVersion: number;
  readonly refreshAfterSeconds: number | null;
  readonly supportCorrelationId: string;
}

export class WorkspacePreparationError extends Error {
  constructor(
    readonly code: string,
    readonly messageToken: string,
    readonly retryable: boolean
  ) {
    super(messageToken);
    this.name = 'WorkspacePreparationError';
  }
}

export class UnsupportedWorkspacePreparationContractError extends WorkspacePreparationError {
  constructor() {
    super(
      'workspace_preparation.unsupported_version',
      'errors.workspacePreparation.unsupported_version',
      false
    );
    this.name = 'UnsupportedWorkspacePreparationContractError';
  }
}

export class InvalidWorkspacePreparationProjectionError extends WorkspacePreparationError {
  constructor() {
    super(
      'workspace_preparation.invalid_projection',
      'errors.workspacePreparation.invalid_projection',
      false
    );
    this.name = 'InvalidWorkspacePreparationProjectionError';
  }
}
