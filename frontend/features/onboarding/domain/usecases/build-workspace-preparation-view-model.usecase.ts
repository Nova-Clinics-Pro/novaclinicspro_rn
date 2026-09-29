import {
  InvalidWorkspacePreparationProjectionError,
  UnsupportedWorkspacePreparationContractError,
  WORKSPACE_PREPARATION_CONTRACT_V1,
  WORKSPACE_PREPARATION_UNIT_ORDER,
  WorkspacePreparation,
  WorkspacePreparationError,
  WorkspacePreparationFailureInformation,
  WorkspacePreparationNextAction,
  WorkspacePreparationOrchestrationState,
  WorkspacePreparationState,
  WorkspacePreparationUnitCode,
} from '../entities/workspace-preparation.entity';

export interface WorkspacePreparationProjectionInput {
  contractVersion: string;
  runId: string;
  state: string;
  aggregateVersion: number;
  progress: { completed: number; total: number; indeterminate: boolean };
  units: readonly {
    code: string;
    outcome: string;
    evidenceVersion: string;
    attempt: number;
    observedAt: string;
    recordedAt: string;
  }[];
  reasonCode: string | null;
  retryAllowed: boolean;
  userRetryCount: number;
  maxUserRetries: number;
  nextAction: string;
  refreshAfterSeconds: number | null;
  supportCorrelationId: string;
  updatedAt: string;
}

const STATES: readonly WorkspacePreparationState[] = [
  'PENDING',
  'PREPARING',
  'PERSONALIZATION_AVAILABLE',
  'RETRYABLE_FAILURE',
  'TERMINAL_FAILURE',
];

const NEXT_ACTIONS: readonly WorkspacePreparationNextAction[] = [
  'START',
  'WAIT',
  'REFRESH',
  'RETRY',
  'ENTER_PERSONALIZATION',
  'CONTACT_SUPPORT',
];

const SAFE_REASON_CODES = [
  'TRANSIENT_DEPENDENCY_FAILURE',
  'TRANSACTION_CONFLICT',
  'EXECUTION_INTERRUPTED',
  'ACCESS_RECONCILIATION_FAILED',
  'ONBOARDING_FOUNDATION_FAILED',
  'ASSOCIATION_INACTIVE',
  'TENANT_INELIGIBLE',
  'UNSAFE_INCONSISTENCY',
  'RETRY_LIMIT_REACHED',
  'UNSUPPORTED_CONTRACT',
] as const;

const NEXT_ACTIONS_BY_STATE: Record<WorkspacePreparationState, readonly WorkspacePreparationNextAction[]> = {
  PENDING: ['START', 'WAIT'],
  PREPARING: ['WAIT', 'REFRESH'],
  PERSONALIZATION_AVAILABLE: ['ENTER_PERSONALIZATION'],
  RETRYABLE_FAILURE: ['RETRY', 'CONTACT_SUPPORT'],
  TERMINAL_FAILURE: ['CONTACT_SUPPORT'],
};

const isUnitCode = (value: string): value is WorkspacePreparationUnitCode =>
  WORKSPACE_PREPARATION_UNIT_ORDER.includes(value as WorkspacePreparationUnitCode);

const parseDate = (value: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new InvalidWorkspacePreparationProjectionError();
  return parsed;
};

export const buildWorkspacePreparationViewModel = (
  input: WorkspacePreparationProjectionInput
): WorkspacePreparation => {
  if (input.contractVersion !== WORKSPACE_PREPARATION_CONTRACT_V1) {
    throw new UnsupportedWorkspacePreparationContractError();
  }
  const state = input.state as WorkspacePreparationState;
  const nextAction = input.nextAction as WorkspacePreparationNextAction;
  const unitCodes = input.units.map((unit) => unit.code);
  if (
    !STATES.includes(state) ||
    !NEXT_ACTIONS.includes(nextAction) ||
    !NEXT_ACTIONS_BY_STATE[state]?.includes(nextAction) ||
    input.aggregateVersion < 1 ||
    input.progress.completed < 0 ||
    input.progress.total !== WORKSPACE_PREPARATION_UNIT_ORDER.length ||
    input.progress.completed > input.progress.total ||
    input.progress.completed !== input.units.length ||
    input.userRetryCount < 0 ||
    input.maxUserRetries !== 3 ||
    input.maxUserRetries < input.userRetryCount ||
    input.units.some(
      (unit) =>
        !isUnitCode(unit.code) ||
        !['SATISFIED', 'RECONCILED'].includes(unit.outcome) ||
        unit.attempt < 1
    ) ||
    new Set(unitCodes).size !== unitCodes.length ||
    (input.reasonCode !== null &&
      !SAFE_REASON_CODES.includes(input.reasonCode as (typeof SAFE_REASON_CODES)[number])) ||
    (input.refreshAfterSeconds !== null &&
      (input.refreshAfterSeconds < 2 ||
        input.refreshAfterSeconds > 30 ||
        !['PENDING', 'PREPARING'].includes(state))) ||
    (input.retryAllowed && state !== 'RETRYABLE_FAILURE')
  ) {
    throw new InvalidWorkspacePreparationProjectionError();
  }

  const result: WorkspacePreparation = {
    ...input,
    contractVersion: WORKSPACE_PREPARATION_CONTRACT_V1,
    state,
    nextAction,
    updatedAt: parseDate(input.updatedAt),
    units: input.units.map((unit) => ({
      ...unit,
      code: unit.code as WorkspacePreparationUnitCode,
      observedAt: parseDate(unit.observedAt),
      recordedAt: parseDate(unit.recordedAt),
    })),
  };
  return Object.freeze({
    ...result,
    progress: Object.freeze({ ...result.progress }),
    units: Object.freeze(result.units.map((unit) => Object.freeze(unit))),
  });
};

const successfulUnitCodes = (
  preparation: WorkspacePreparation
): readonly WorkspacePreparationUnitCode[] =>
  WORKSPACE_PREPARATION_UNIT_ORDER.filter((code) =>
    preparation.units.some(
      (unit) =>
        unit.code === code &&
        (unit.outcome === 'SATISFIED' || unit.outcome === 'RECONCILED')
    )
  );

export const deriveWorkspacePreparationState = (
  preparation: WorkspacePreparation
): WorkspacePreparationOrchestrationState => {
  const completedUnits = successfulUnitCodes(preparation);
  const remainingUnits = WORKSPACE_PREPARATION_UNIT_ORDER.filter(
    (code) => !completedUnits.includes(code)
  );
  const retryRemaining = Math.max(
    0,
    preparation.maxUserRetries - preparation.userRetryCount
  );
  const retryExhausted = retryRemaining === 0;
  const retryAvailable =
    preparation.state === 'RETRYABLE_FAILURE' &&
    preparation.retryAllowed &&
    !retryExhausted;
  const personalizationAvailable =
    preparation.state === 'PERSONALIZATION_AVAILABLE' &&
    completedUnits.length === WORKSPACE_PREPARATION_UNIT_ORDER.length &&
    preparation.nextAction === 'ENTER_PERSONALIZATION';

  return Object.freeze({
    lifecycle: preparation.state,
    progress: Object.freeze({
      completedUnits: Object.freeze(completedUnits),
      remainingUnits: Object.freeze(remainingUnits),
      currentUnit:
        preparation.state === 'PREPARING' ? (remainingUnits[0] ?? null) : null,
      completed: preparation.progress.completed,
      total: preparation.progress.total,
      percentage: Math.floor(
        (preparation.progress.completed / preparation.progress.total) * 100
      ),
      indeterminate: preparation.progress.indeterminate,
    }),
    retry: Object.freeze({
      available: retryAvailable,
      exhausted: retryExhausted,
      used: preparation.userRetryCount,
      maximum: preparation.maxUserRetries,
      remaining: retryRemaining,
    }),
    failure: Object.freeze({
      kind:
        preparation.state === 'RETRYABLE_FAILURE'
          ? 'RETRYABLE'
          : preparation.state === 'TERMINAL_FAILURE'
            ? 'TERMINAL'
            : 'NONE',
      reasonCode: preparation.reasonCode,
      messageToken: preparation.reasonCode
        ? `errors.workspacePreparation.${preparation.reasonCode.toLowerCase()}`
        : null,
    }),
    nextAction: preparation.nextAction,
    personalizationAvailable,
    aggregateVersion: preparation.aggregateVersion,
    refreshAfterSeconds: preparation.refreshAfterSeconds,
    supportCorrelationId: preparation.supportCorrelationId,
  });
};

export const translateWorkspacePreparationError = (
  error: unknown
): WorkspacePreparationFailureInformation => {
  if (error instanceof WorkspacePreparationError) {
    return Object.freeze({
      kind: error.retryable ? 'RETRYABLE' : 'TERMINAL',
      reasonCode: error.code,
      messageToken: error.messageToken,
    });
  }
  return Object.freeze({
    kind: 'RETRYABLE',
    reasonCode: 'workspace_preparation.execution_failure',
    messageToken: 'errors.workspacePreparation.execution_failure',
  });
};
