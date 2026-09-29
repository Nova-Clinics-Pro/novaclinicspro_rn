import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { OnboardingStatus } from '../../domain/entities/onboarding-status.entity';
import {
  AuthoritativeStepUpdateEvidence,
  StepConflictError,
  createDraftRevisionEvidence,
  deriveDraftConflictFacts,
} from '../../domain/entities/step-revision.entity';
import {
  clearStepDraftAndSync,
  syncWizardDraftToStorage,
  useWizardStore,
} from '../stores/wizard.store';

export interface RevisionAwareSaveContext {
  readonly expectedRevision: string;
  readonly idempotencyKey: string;
}

export type RevisionAwareSaveHandler = (
  context: RevisionAwareSaveContext
) => Promise<void>;

export type ConflictRecoveryFailure =
  | 'REFRESH_FAILED'
  | 'DRAFT_FAILED'
  | 'SECOND_CONFLICT'
  | 'TENANT_MISMATCH'
  | 'UNAUTHORIZED'
  | 'UNSUPPORTED'
  | 'BACKEND_FAILED';

export type ConflictRecoveryReason =
  | 'STALE_REVISION'
  | 'OBSERVED_REVISION_MISMATCH'
  | 'PROJECTION_MISMATCH'
  | 'MISSING_EVIDENCE'
  | 'SUBMISSION_FAILURE';

interface PendingSubmission {
  readonly scopeGeneration: number;
  readonly stepCode: string;
  readonly idempotencyKey: string;
  readonly submit: RevisionAwareSaveHandler;
}

interface RecoveryState {
  readonly visible: boolean;
  readonly stepCode: string | null;
  readonly reason: ConflictRecoveryReason | null;
  readonly pendingAction: 'USE_LATEST' | 'KEEP_LOCAL' | null;
  readonly failure: ConflictRecoveryFailure | null;
}

const INITIAL_STATE: RecoveryState = Object.freeze({
  visible: false,
  stepCode: null,
  reason: null,
  pendingAction: null,
  failure: null,
});

const mapFailure = (error: unknown): ConflictRecoveryFailure => {
  if (!(error instanceof StepConflictError)) return 'BACKEND_FAILED';
  if (error.kind === 'TENANT_MISMATCH' || error.kind === 'ORGANIZATION_MISMATCH') {
    return 'TENANT_MISMATCH';
  }
  if (error.kind === 'UNAUTHORIZED' || error.kind === 'FORBIDDEN') {
    return 'UNAUTHORIZED';
  }
  if (
    error.kind === 'MALFORMED_CONFLICT' ||
    error.kind === 'UNSUPPORTED_CONTRACT'
  ) {
    return 'UNSUPPORTED';
  }
  return 'BACKEND_FAILED';
};

const getEvidence = (
  status: OnboardingStatus | null,
  stepCode: string
): AuthoritativeStepUpdateEvidence | null =>
  status?.steps.get(stepCode)?.authoritativeEvidence ?? null;

interface UseDraftConflictRecoveryInput {
  readonly organizationId: string;
  readonly tenantId: string;
  readonly status: OnboardingStatus | null;
  readonly activeStepCode: string | null;
  readonly projectedStepCodes: readonly string[];
  readonly refreshStatus: () => Promise<OnboardingStatus | null>;
  readonly onRecovered: () => void;
  readonly announce: (outcome: 'USE_LATEST' | 'KEEP_LOCAL') => void;
}

export const useDraftConflictRecovery = ({
  organizationId,
  tenantId,
  status,
  activeStepCode,
  projectedStepCodes,
  refreshStatus,
  onRecovered,
  announce,
}: UseDraftConflictRecoveryInput) => {
  const stepDrafts = useWizardStore((state) => state.stepDrafts);
  const acceptStepAuthoritativeEvidence = useWizardStore(
    (state) => state.acceptStepAuthoritativeEvidence
  );
  const [state, setState] = useState<RecoveryState>(INITIAL_STATE);
  const pendingSubmissionRef = useRef<PendingSubmission | null>(null);
  const actionInFlightRef = useRef(false);
  const scopeGenerationRef = useRef(0);
  const scopeRef = useRef({ organizationId, tenantId });

  const projectedStepSet = useMemo(
    () => new Set(projectedStepCodes),
    [projectedStepCodes]
  );

  useEffect(() => {
    const previous = scopeRef.current;
    if (
      previous.organizationId !== organizationId ||
      previous.tenantId !== tenantId
    ) {
      scopeGenerationRef.current += 1;
      pendingSubmissionRef.current = null;
      actionInFlightRef.current = false;
      setState(INITIAL_STATE);
      scopeRef.current = { organizationId, tenantId };
    }
  }, [organizationId, tenantId]);

  useEffect(
    () => () => {
      scopeGenerationRef.current += 1;
      pendingSubmissionRef.current = null;
      actionInFlightRef.current = false;
    },
    []
  );

  useEffect(() => {
    const pending = pendingSubmissionRef.current;
    if (pending && pending.stepCode !== activeStepCode) {
      scopeGenerationRef.current += 1;
      pendingSubmissionRef.current = null;
      actionInFlightRef.current = false;
      setState(INITIAL_STATE);
    }
  }, [activeStepCode]);

  useEffect(() => {
    if (!status || status.tenantId !== tenantId || !organizationId) return;
    const staleStepCodes = Object.keys(stepDrafts).filter((stepCode) => {
      const step = status.steps.get(stepCode);
      return !projectedStepSet.has(stepCode) || step?.isComplete === true;
    });
    if (staleStepCodes.length === 0) return;

    const draftsBeforeCleanup = useWizardStore.getState().stepDrafts;
    const store = useWizardStore.getState();
    staleStepCodes.forEach((stepCode) => store.clearStepDraft(stepCode));
    void syncWizardDraftToStorage().catch(() => {
      if (scopeRef.current.tenantId === tenantId) {
        useWizardStore.getState().restoreStepDrafts(draftsBeforeCleanup);
      }
    });
  }, [organizationId, projectedStepSet, status, stepDrafts, tenantId]);

  const openRecovery = useCallback(
    (
      pending: PendingSubmission,
      reason: ConflictRecoveryReason,
      failure: ConflictRecoveryFailure | null = null
    ) => {
      pendingSubmissionRef.current = pending;
      setState({
        visible: true,
        stepCode: pending.stepCode,
        reason,
        pendingAction: null,
        failure,
      });
    },
    []
  );

  const executeSubmission = useCallback(
    async (input: {
      stepCode: string;
      idempotencyKey: string;
      submit: RevisionAwareSaveHandler;
    }): Promise<'SUBMITTED' | 'RECOVERY_REQUIRED'> => {
      if (actionInFlightRef.current || pendingSubmissionRef.current) {
        return 'RECOVERY_REQUIRED';
      }
      const generation = scopeGenerationRef.current;
      const pending: PendingSubmission = {
        ...input,
        scopeGeneration: generation,
      };
      const evidence = getEvidence(status, input.stepCode);
      const draft = useWizardStore.getState().stepDrafts[input.stepCode] ?? null;

      if (
        !evidence ||
        evidence.tenantId !== tenantId ||
        !organizationId ||
        !projectedStepSet.has(input.stepCode)
      ) {
        openRecovery(pending, 'MISSING_EVIDENCE');
        return 'RECOVERY_REQUIRED';
      }

      if (draft) {
        const facts = deriveDraftConflictFacts({
          currentOrganizationId: organizationId,
          localDraftExists: true,
          localEvidence: draft.baseEvidence,
          currentEvidence: evidence,
        });
        if (facts.legacyOrMissingEvidence) {
          openRecovery(pending, 'MISSING_EVIDENCE');
          return 'RECOVERY_REQUIRED';
        }
        if (facts.projectionMatches === false) {
          openRecovery(pending, 'PROJECTION_MISMATCH');
          return 'RECOVERY_REQUIRED';
        }
        if (facts.revisionsMatch === false) {
          openRecovery(pending, 'OBSERVED_REVISION_MISMATCH');
          return 'RECOVERY_REQUIRED';
        }
      }

      try {
        await input.submit({
          expectedRevision: evidence.revision.value,
          idempotencyKey: input.idempotencyKey,
        });
        return 'SUBMITTED';
      } catch (error) {
        if (
          error instanceof StepConflictError &&
          error.kind === 'STALE_REVISION'
        ) {
          openRecovery(pending, 'STALE_REVISION');
          return 'RECOVERY_REQUIRED';
        }
        openRecovery(pending, 'SUBMISSION_FAILURE', mapFailure(error));
        return 'RECOVERY_REQUIRED';
      }
    },
    [openRecovery, organizationId, projectedStepSet, status, tenantId]
  );

  const useLatest = useCallback(async () => {
    const pending = pendingSubmissionRef.current;
    if (!pending || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setState((current) => ({
      ...current,
      pendingAction: 'USE_LATEST',
      failure: null,
    }));

    try {
      const latestStatus = await refreshStatus();
      if (pending.scopeGeneration !== scopeGenerationRef.current) return;
      if (!latestStatus) throw new Error('Authoritative status unavailable');
      if (latestStatus.tenantId !== tenantId) {
        setState((current) => ({
          ...current,
          pendingAction: null,
          failure: 'TENANT_MISMATCH',
        }));
        return;
      }
      const latestStep = latestStatus.steps.get(pending.stepCode);
      if (
        latestStep &&
        projectedStepSet.has(pending.stepCode) &&
        !latestStep.authoritativeEvidence
      ) {
        setState((current) => ({
          ...current,
          pendingAction: null,
          failure: 'UNSUPPORTED',
        }));
        return;
      }

      const draftBeforeUseLatest =
        useWizardStore.getState().stepDrafts[pending.stepCode] ?? null;
      try {
        await clearStepDraftAndSync(pending.stepCode);
      } catch {
        if (draftBeforeUseLatest) {
          const currentDrafts = useWizardStore.getState().stepDrafts;
          useWizardStore.getState().restoreStepDrafts({
            ...currentDrafts,
            [pending.stepCode]: draftBeforeUseLatest,
          });
        }
        setState((current) => ({
          ...current,
          pendingAction: null,
          failure: 'DRAFT_FAILED',
        }));
        return;
      }
      if (pending.scopeGeneration !== scopeGenerationRef.current) return;
      pendingSubmissionRef.current = null;
      setState(INITIAL_STATE);
      onRecovered();
      announce('USE_LATEST');
    } catch {
      if (pending.scopeGeneration !== scopeGenerationRef.current) return;
      setState((current) => ({
        ...current,
        pendingAction: null,
        failure: 'REFRESH_FAILED',
      }));
    } finally {
      actionInFlightRef.current = false;
    }
  }, [
    announce,
    onRecovered,
    projectedStepSet,
    refreshStatus,
    tenantId,
  ]);

  const keepLocal = useCallback(async () => {
    const pending = pendingSubmissionRef.current;
    if (!pending || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setState((current) => ({
      ...current,
      pendingAction: 'KEEP_LOCAL',
      failure: null,
    }));

    try {
      const latestStatus = await refreshStatus();
      if (pending.scopeGeneration !== scopeGenerationRef.current) return;
      if (!latestStatus) throw new Error('Authoritative status unavailable');
      if (latestStatus.tenantId !== tenantId) {
        setState((current) => ({
          ...current,
          pendingAction: null,
          failure: 'TENANT_MISMATCH',
        }));
        return;
      }
      const latestStep = latestStatus.steps.get(pending.stepCode);
      const evidence = latestStep?.authoritativeEvidence ?? null;
      if (
        !evidence ||
        !organizationId ||
        !projectedStepSet.has(pending.stepCode) ||
        latestStep?.isComplete
      ) {
        setState((current) => ({
          ...current,
          pendingAction: null,
          failure: latestStep?.isComplete ? 'BACKEND_FAILED' : 'UNSUPPORTED',
        }));
        return;
      }

      const draft = useWizardStore.getState().stepDrafts[pending.stepCode];
      if (draft) {
        try {
          acceptStepAuthoritativeEvidence(
            pending.stepCode,
            createDraftRevisionEvidence({
              organizationId,
              tenantId,
              stepCode: pending.stepCode,
              revision: evidence.revision.value,
              templateVersion: evidence.projectionIdentity.templateVersion,
              capabilityRevision:
                evidence.projectionIdentity.capabilityRevision,
            })
          );
          await syncWizardDraftToStorage();
        } catch {
          const currentDrafts = useWizardStore.getState().stepDrafts;
          useWizardStore.getState().restoreStepDrafts({
            ...currentDrafts,
            [pending.stepCode]: draft,
          });
          setState((current) => ({
            ...current,
            pendingAction: null,
            failure: 'DRAFT_FAILED',
          }));
          return;
        }
      }

      await pending.submit({
        expectedRevision: evidence.revision.value,
        idempotencyKey: pending.idempotencyKey,
      });
      if (pending.scopeGeneration !== scopeGenerationRef.current) return;
      pendingSubmissionRef.current = null;
      setState(INITIAL_STATE);
      announce('KEEP_LOCAL');
    } catch (error) {
      if (pending.scopeGeneration !== scopeGenerationRef.current) return;
      setState((current) => ({
        ...current,
        pendingAction: null,
        failure:
          error instanceof StepConflictError && error.kind === 'STALE_REVISION'
            ? 'SECOND_CONFLICT'
            : mapFailure(error),
      }));
    } finally {
      actionInFlightRef.current = false;
    }
  }, [
    acceptStepAuthoritativeEvidence,
    announce,
    organizationId,
    projectedStepSet,
    refreshStatus,
    tenantId,
  ]);

  const cancelForScopeChange = useCallback(() => {
    scopeGenerationRef.current += 1;
    pendingSubmissionRef.current = null;
    actionInFlightRef.current = false;
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    actionsDisabled: state.pendingAction !== null,
    useLatestDisabled:
      state.pendingAction !== null ||
      state.failure === 'TENANT_MISMATCH' ||
      state.failure === 'UNAUTHORIZED',
    keepLocalDisabled:
      state.pendingAction !== null ||
      state.failure === 'TENANT_MISMATCH' ||
      state.failure === 'UNAUTHORIZED' ||
      state.failure === 'UNSUPPORTED',
    executeSubmission,
    useLatest,
    keepLocal,
    cancelForScopeChange,
  };
};
