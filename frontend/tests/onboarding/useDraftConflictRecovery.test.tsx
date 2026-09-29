import { act, renderHook, waitFor } from '@testing-library/react-native';

import { OnboardingStatus } from '../../features/onboarding/domain/entities/onboarding-status.entity';
import {
  StepConflictError,
  createAuthoritativeStepUpdateEvidence,
  createDraftRevisionEvidence,
} from '../../features/onboarding/domain/entities/step-revision.entity';
import { useDraftConflictRecovery } from '../../features/onboarding/presentation/hooks/useDraftConflictRecovery';
import { useWizardStore } from '../../features/onboarding/presentation/stores/wizard.store';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiRemove: jest.fn(),
}));

const revision = (character: string) => `step-rev-v1:${character.repeat(64)}`;
const capabilityRevision = `cap-v1:${'c'.repeat(64)}`;
const stepCode = 'clinic_profile';

const evidence = (value: string) =>
  createAuthoritativeStepUpdateEvidence({
    tenantId: 'tenant-a',
    stepCode,
    revision: value,
    updatedAt: '2026-07-23T10:00:00Z',
    templateVersion: 'template-v1',
    capabilityRevision,
  });

const status = (
  value: string,
  options: { complete?: boolean; visible?: boolean } = {}
): OnboardingStatus => ({
  tenantId: 'tenant-a',
  clinicType: 'general',
  totalSteps: 1,
  completedSteps: options.complete ? 1 : 0,
  completionPercentage: options.complete ? 100 : 0,
  currentStep: stepCode,
  nextRecommendedStep: null,
  isReadyToGoLive: false,
  visibleSteps: options.visible === false ? [] : [stepCode],
  actionableSteps: options.complete ? [] : [stepCode],
  steps: new Map([
    [
      stepCode,
      {
        code: stepCode,
        status: options.complete ? 'completed' : 'in_progress',
        isComplete: options.complete ?? false,
        isValid: options.complete ?? false,
        issues: [],
        blockedReason: null,
        actionUrl: '',
        entityType: '',
        icon: '',
        category: '',
        isVisible: options.visible !== false,
        isActionable: !options.complete,
        evidenceAvailability: 'AVAILABLE',
        authoritativeEvidence: evidence(value),
      },
    ],
  ]),
});

const localEvidence = (value: string) =>
  createDraftRevisionEvidence({
    organizationId: 'org-a',
    tenantId: 'tenant-a',
    stepCode,
    revision: value,
    templateVersion: 'template-v1',
    capabilityRevision,
  });

const createProps = (currentStatus = status(revision('a'))) => ({
  organizationId: 'org-a',
  tenantId: 'tenant-a',
  status: currentStatus,
  activeStepCode: stepCode,
  projectedStepCodes: [stepCode],
  refreshStatus: jest.fn().mockResolvedValue(currentStatus),
  onRecovered: jest.fn(),
  announce: jest.fn(),
});

describe('useDraftConflictRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWizardStore.getState().reset();
    useWizardStore.getState().setTenantId('tenant-a');
  });

  it('submits matching evidence without using local timestamps as authority', async () => {
    useWizardStore
      .getState()
      .setStepDraft(stepCode, { name: 'Local' }, localEvidence(revision('a')));
    const props = createProps();
    const submit = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDraftConflictRecovery(props));

    await act(async () => {
      await result.current.executeSubmission({
        stepCode,
        idempotencyKey: 'submission-1',
        submit,
      });
    });

    expect(submit).toHaveBeenCalledWith({
      expectedRevision: revision('a'),
      idempotencyKey: 'submission-1',
    });
    expect(result.current.visible).toBe(false);
  });

  it('requires recovery for an observed-revision mismatch and does not submit automatically', async () => {
    useWizardStore
      .getState()
      .setStepDraft(stepCode, { name: 'Local' }, localEvidence(revision('a')));
    const props = createProps(status(revision('b')));
    const submit = jest.fn();
    const { result } = renderHook(() => useDraftConflictRecovery(props));

    await act(async () => {
      await result.current.executeSubmission({
        stepCode,
        idempotencyKey: 'submission-2',
        submit,
      });
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.reason).toBe('OBSERVED_REVISION_MISMATCH');
    expect(submit).not.toHaveBeenCalled();
  });

  it('requires one recovery surface for missing evidence and duplicate attempts', async () => {
    useWizardStore.getState().setStepDraft(stepCode, { legacy: true });
    const props = createProps();
    const firstSubmit = jest.fn();
    const secondSubmit = jest.fn();
    const { result } = renderHook(() => useDraftConflictRecovery(props));

    await act(async () => {
      await result.current.executeSubmission({
        stepCode,
        idempotencyKey: 'submission-legacy',
        submit: firstSubmit,
      });
      await result.current.executeSubmission({
        stepCode,
        idempotencyKey: 'submission-duplicate',
        submit: secondSubmit,
      });
    });

    expect(result.current.reason).toBe('MISSING_EVIDENCE');
    expect(firstSubmit).not.toHaveBeenCalled();
    expect(secondSubmit).not.toHaveBeenCalled();
  });

  it('requires recovery when the authoritative projection identity changes', async () => {
    const changedProjectionEvidence = createDraftRevisionEvidence({
      organizationId: 'org-a',
      tenantId: 'tenant-a',
      stepCode,
      revision: revision('a'),
      templateVersion: 'template-old',
      capabilityRevision,
    });
    useWizardStore
      .getState()
      .setStepDraft(stepCode, { name: 'Local' }, changedProjectionEvidence);
    const props = createProps();
    const { result } = renderHook(() => useDraftConflictRecovery(props));

    await act(async () => {
      await result.current.executeSubmission({
        stepCode,
        idempotencyKey: 'submission-projection',
        submit: jest.fn(),
      });
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.reason).toBe('PROJECTION_MISMATCH');
  });

  it('uses latest only after refresh and clears only the matching draft', async () => {
    useWizardStore
      .getState()
      .setStepDraft(stepCode, { name: 'Local' }, localEvidence(revision('a')));
    useWizardStore.getState().setStepDraft('other', { safe: true });
    const props = {
      ...createProps(status(revision('b'))),
      projectedStepCodes: [stepCode, 'other'],
    };
    const { result } = renderHook(() => useDraftConflictRecovery(props));

    await act(async () => {
      await result.current.executeSubmission({
        stepCode,
        idempotencyKey: 'submission-3',
        submit: jest.fn(),
      });
      await result.current.useLatest();
    });

    expect(props.refreshStatus).toHaveBeenCalledTimes(1);
    expect(useWizardStore.getState().stepDrafts[stepCode]).toBeUndefined();
    expect(useWizardStore.getState().stepDrafts.other).toBeDefined();
    expect(props.onRecovered).toHaveBeenCalledTimes(1);
    expect(props.announce).toHaveBeenCalledWith('USE_LATEST');
    expect(result.current.visible).toBe(false);
  });

  it('keeps the draft, rebinds current evidence, and preserves idempotency on explicit Keep Local', async () => {
    useWizardStore
      .getState()
      .setStepDraft(stepCode, { name: 'Local' }, localEvidence(revision('a')));
    const props = createProps(status(revision('b')));
    const submit = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDraftConflictRecovery(props));

    await act(async () => {
      await result.current.executeSubmission({
        stepCode,
        idempotencyKey: 'submission-4',
        submit,
      });
      await result.current.keepLocal();
    });

    expect(submit).toHaveBeenCalledWith({
      expectedRevision: revision('b'),
      idempotencyKey: 'submission-4',
    });
    expect(
      useWizardStore.getState().stepDrafts[stepCode]?.baseEvidence?.revision.value
    ).toBe(revision('b'));
    expect(props.announce).toHaveBeenCalledWith('KEEP_LOCAL');
    expect(result.current.visible).toBe(false);
  });

  it('keeps the recovery surface open after a second concurrent stale conflict', async () => {
    useWizardStore
      .getState()
      .setStepDraft(stepCode, { name: 'Local' }, localEvidence(revision('a')));
    const props = createProps(status(revision('b')));
    const submit = jest.fn().mockRejectedValue(
      new StepConflictError(
        'STALE_REVISION',
        'onboarding.step_revision_conflict',
        'errors.onboarding.stepRevisionConflict',
        false
      )
    );
    const { result } = renderHook(() => useDraftConflictRecovery(props));

    await act(async () => {
      await result.current.executeSubmission({
        stepCode,
        idempotencyKey: 'submission-5',
        submit,
      });
      await result.current.keepLocal();
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.failure).toBe('SECOND_CONFLICT');
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('opens recovery when the backend rejects an otherwise current revision', async () => {
    const props = createProps();
    const submit = jest.fn().mockRejectedValue(
      new StepConflictError(
        'STALE_REVISION',
        'onboarding.step_revision_conflict',
        'errors.onboarding.stepRevisionConflict',
        false
      )
    );
    const { result } = renderHook(() => useDraftConflictRecovery(props));

    await act(async () => {
      await result.current.executeSubmission({
        stepCode,
        idempotencyKey: 'submission-backend-stale',
        submit,
      });
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.reason).toBe('STALE_REVISION');
  });

  it('retires completed and hidden step drafts without touching newly projected steps', async () => {
    useWizardStore.getState().setStepDraft(stepCode, { complete: true });
    useWizardStore.getState().setStepDraft('retired', { hidden: true });
    useWizardStore.getState().setStepDraft('new_step', { new: true });
    const currentStatus = status(revision('b'), { complete: true });
    const props = {
      ...createProps(currentStatus),
      projectedStepCodes: [stepCode, 'new_step'],
    };

    renderHook(() => useDraftConflictRecovery(props));

    await waitFor(() => {
      expect(useWizardStore.getState().stepDrafts[stepCode]).toBeUndefined();
      expect(useWizardStore.getState().stepDrafts.retired).toBeUndefined();
      expect(useWizardStore.getState().stepDrafts.new_step).toBeDefined();
    });
  });

  it('ignores a recovery result after the effective tenant changes', async () => {
    useWizardStore
      .getState()
      .setStepDraft(stepCode, { name: 'Tenant A' }, localEvidence(revision('a')));
    let resolveRefresh: ((value: OnboardingStatus) => void) | undefined;
    const firstProps = {
      ...createProps(status(revision('b'))),
      refreshStatus: jest.fn(
        () =>
          new Promise<OnboardingStatus>((resolve) => {
            resolveRefresh = resolve;
          })
      ),
    };
    let activeProps: Parameters<typeof useDraftConflictRecovery>[0] = firstProps;
    const { result, rerender } = renderHook(() =>
      useDraftConflictRecovery(activeProps)
    );

    await act(async () => {
      await result.current.executeSubmission({
        stepCode,
        idempotencyKey: 'submission-tenant-a',
        submit: jest.fn(),
      });
    });
    act(() => {
      void result.current.useLatest();
    });
    activeProps = {
      ...firstProps,
      organizationId: 'org-b',
      tenantId: 'tenant-b',
      status: null,
      projectedStepCodes: [],
    };
    rerender({});
    await act(async () => {
      resolveRefresh?.(status(revision('b')));
    });

    expect(result.current.visible).toBe(false);
    expect(useWizardStore.getState().stepDrafts[stepCode]).toBeDefined();
    expect(firstProps.onRecovered).not.toHaveBeenCalled();
  });
});
