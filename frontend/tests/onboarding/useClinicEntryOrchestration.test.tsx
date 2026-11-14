import { act, renderHook, waitFor } from '@testing-library/react-native';

import { queryClient } from '../../core/api/queryClient';
import { useClinicEntryOrchestration } from '../../features/onboarding/presentation/hooks/useClinicEntryOrchestration';
import {
  getUnsavedWorkSnapshot,
  isDecisionPending,
  registerDraft,
  resetUnsavedWorkForTests,
  resolveUnsavedWorkDecision,
} from '../../core/unsavedWork/unsavedWorkRegistry';

const mockReplace = jest.fn();
const mockDismissAll = jest.fn();
const mockCanDismiss = jest.fn(() => true);
const mockRefreshSession = jest.fn();
const mockLogout = jest.fn();
const mockSetSelectedClinic = jest.fn();
const mockClearWizardDraft = jest.fn();
const mockSetTenantId = jest.fn();
const mockCreateOrganization = jest.fn();
const mockRequestContact = jest.fn();
const mockContactStatus = jest.fn();
const mockOwnershipStatus = jest.fn();
const mockCreateClinic = jest.fn();
const mockAssociateClinic = jest.fn();
const mockSelectTenant = jest.fn();
const mockRefreshTenant = jest.fn();
const mockRefetchOrganization = jest.fn();

let mockOrganizationQuery: any;
let mockAuth: any;

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, dismissAll: mockDismissAll, canDismiss: () => mockCanDismiss() }),
}));

jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useOrganizationContextQuery: () => mockOrganizationQuery,
  useCreateInitialOrganizationMutation: () => ({ mutateAsync: mockCreateOrganization }),
  useRequestContactVerificationMutation: () => ({ mutateAsync: mockRequestContact }),
  useContactVerificationStatusMutation: () => ({ mutateAsync: mockContactStatus }),
  useOwnershipStatusMutation: () => ({ mutateAsync: mockOwnershipStatus }),
  useCreateClinicEntryMutation: () => ({ mutateAsync: mockCreateClinic }),
  useAssociateClinicEntryMutation: () => ({ mutateAsync: mockAssociateClinic }),
  useSelectEffectiveTenantMutation: () => ({ mutateAsync: mockSelectTenant }),
  useRefreshEffectiveTenantMutation: () => ({ mutateAsync: mockRefreshTenant }),
}));

jest.mock('../../features/onboarding/presentation/stores/wizard.store', () => ({
  clearWizardDraftStorageForIdentity: (...args: unknown[]) => mockClearWizardDraft(...args),
  useWizardStore: {
    getState: () => ({ setTenantId: mockSetTenantId }),
  },
}));

const newClinicInput = {
  clinicName: 'Nova Clinic',
  clinicTypeSpecialty: 'General',
  addressLine1: '1 Main Road',
  city: 'Pune',
  state: 'MH',
  postalCode: '411001',
  countryCode: 'IN',
  contactKind: 'email' as const,
  contactValue: 'owner@example.com',
};

const context = (effectiveTenantId: string | null, clinics: any[] = []) => ({
  memberships: [
    {
      organizationId: 'org-1',
      organizationName: 'Nova Group',
      authorizedClinics: clinics,
      effectiveTenantId,
      selectionRequired: clinics.length > 1 && !effectiveTenantId,
    },
  ],
  effectiveOrganizationId: effectiveTenantId ? 'org-1' : null,
  effectiveTenantId,
  selectionRequired: clinics.length > 1 && !effectiveTenantId,
  sessionRefreshRequired: false,
});

describe('useClinicEntryOrchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetUnsavedWorkForTests();
    mockCanDismiss.mockReturnValue(true);
    mockAuth = {
      currentUser: { userId: 'user-1', tenantId: null },
      selectedClinicId: null,
      refreshSession: mockRefreshSession,
      logout: mockLogout,
      setSelectedClinic: mockSetSelectedClinic,
    };
    mockOrganizationQuery = {
      data: { memberships: [], effectiveOrganizationId: null, effectiveTenantId: null },
      isLoading: false,
      error: null,
      refetch: mockRefetchOrganization,
    };
    mockCreateOrganization.mockResolvedValue({
      organizationId: 'org-1',
      displayName: 'Nova Group',
      role: 'organization_owner',
      replayed: false,
    });
    mockRequestContact.mockResolvedValue({
      evidenceId: 'evidence-1',
      status: 'verified',
      reference: 'secret-reference',
      referenceRecoverable: true,
    });
    mockCreateClinic.mockResolvedValue({ effectiveTenantId: 'tenant-1' });
    mockAssociateClinic.mockResolvedValue({ effectiveTenantId: 'tenant-1' });
    mockRefreshTenant.mockResolvedValue({ effectiveTenantId: 'tenant-1' });
    mockRefreshSession.mockResolvedValue(undefined);
    mockClearWizardDraft.mockResolvedValue(undefined);
    mockRefetchOrganization.mockResolvedValue({ data: context('tenant-1') });
    jest.spyOn(queryClient, 'cancelQueries').mockResolvedValue(undefined);
    jest.spyOn(queryClient, 'clear').mockImplementation(() => undefined);
    jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates the initial organization and completes automatic New Clinic handoff', async () => {
    const { result } = renderHook(() => useClinicEntryOrchestration());

    await act(async () => {
      await result.current.submitNewClinic(newClinicInput, 'Nova Group');
    });

    expect(mockCreateOrganization).toHaveBeenCalledWith('Nova Group');
    expect(mockRequestContact).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', intendedOperation: 'clinic_entry.create.v1' })
    );
    expect(mockCreateClinic).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', evidenceReference: 'secret-reference' })
    );
    expect(mockRefreshTenant).toHaveBeenCalledWith('org-1');
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockSetSelectedClinic).toHaveBeenCalledWith('tenant-1');
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/setup-wizard?tenantId=tenant-1');
    expect(result.current.state).toBe('complete');
  });

  it('resumes pending manual contact verification without duplicating creation', async () => {
    mockOrganizationQuery.data = context(null);
    mockRequestContact.mockResolvedValueOnce({
      evidenceId: 'evidence-1',
      status: 'pending',
      reference: 'secret-reference',
      referenceRecoverable: true,
    });
    mockContactStatus.mockResolvedValue({ evidenceId: 'evidence-1', status: 'verified' });
    const { result } = renderHook(() => useClinicEntryOrchestration());

    await act(async () => {
      await result.current.submitNewClinic(newClinicInput);
    });
    expect(result.current.state).toBe('pending');

    await act(async () => {
      await result.current.resumePending();
    });

    expect(mockRequestContact).toHaveBeenCalledTimes(1);
    expect(mockCreateClinic).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('complete');
  });

  it('resumes ownership approval before associating an existing clinic', async () => {
    mockOrganizationQuery.data = context(null);
    mockOwnershipStatus
      .mockResolvedValueOnce({ status: 'pending', version: 1, allowedNextActions: [] })
      .mockResolvedValueOnce({ status: 'approved', version: 2, allowedNextActions: [] });
    const { result } = renderHook(() => useClinicEntryOrchestration());

    await act(async () => {
      await result.current.submitBringClinic({
        ownershipReference: 'opaque-ownership-reference',
        contactKind: 'email',
        contactValue: 'owner@example.com',
      });
    });
    expect(result.current.state).toBe('pending');

    await act(async () => {
      await result.current.resumePending();
    });

    expect(mockOwnershipStatus).toHaveBeenCalledTimes(2);
    expect(mockAssociateClinic).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('complete');
  });

  it('selects among multiple clinics and clears outgoing tenant lifecycle state', async () => {
    mockAuth.currentUser.tenantId = 'tenant-old';
    mockAuth.selectedClinicId = 'tenant-old';
    const clinics = [
      { tenantId: 'tenant-1', clinicName: 'Clinic One' },
      { tenantId: 'tenant-2', clinicName: 'Clinic Two' },
    ];
    mockOrganizationQuery.data = context(null, clinics);
    mockCreateClinic.mockResolvedValue({ effectiveTenantId: null });
    mockRefetchOrganization
      .mockResolvedValueOnce({ data: context(null, clinics) })
      .mockResolvedValueOnce({ data: context('tenant-2', clinics) });
    const { result } = renderHook(() => useClinicEntryOrchestration());

    await act(async () => {
      await result.current.submitNewClinic(newClinicInput);
    });
    expect(result.current.state).toBe('selecting_tenant');

    await act(async () => {
      await result.current.chooseTenant('tenant-2');
    });

    expect(queryClient.cancelQueries).toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(mockClearWizardDraft).toHaveBeenCalledWith({
      tenantId: 'tenant-old',
      userId: 'user-1',
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    expect(mockSetTenantId).toHaveBeenCalledWith('tenant-2');
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/setup-wizard?tenantId=tenant-2');
  });

  it('retries only session handoff after a stale-session failure', async () => {
    mockOrganizationQuery.data = context(null);
    mockRefreshSession
      .mockRejectedValueOnce(new Error('stale session'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useClinicEntryOrchestration());

    await act(async () => {
      await result.current.submitNewClinic(newClinicInput);
    });
    expect(result.current.state).toBe('error');

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state).toBe('complete'));

    expect(mockCreateClinic).toHaveBeenCalledTimes(1);
    expect(mockRefreshSession).toHaveBeenCalledTimes(2);
  });

  describe('clinic switch resets the previous clinic navigation (D7)', () => {
    const clinics = [
      { tenantId: 'tenant-1', clinicName: 'Clinic One' },
      { tenantId: 'tenant-2', clinicName: 'Clinic Two' },
    ];

    const prepareSwitch = (outgoing: string | null) => {
      mockAuth = {
        currentUser: { userId: 'user-1', tenantId: outgoing },
        selectedClinicId: outgoing,
        refreshSession: mockRefreshSession,
        logout: mockLogout,
        setSelectedClinic: mockSetSelectedClinic,
      };
      mockOrganizationQuery.data = context(null, clinics);
      mockCreateClinic.mockResolvedValue({ effectiveTenantId: null });
      mockRefreshTenant.mockResolvedValue({ effectiveTenantId: 'tenant-2' });
      mockRefetchOrganization
        .mockResolvedValueOnce({ data: context(null, clinics) })
        .mockResolvedValue({ data: context('tenant-2', clinics) });
    };
    const reachChoice = async (hook: ReturnType<typeof renderHook<ReturnType<typeof useClinicEntryOrchestration>, unknown>>) => {
      await act(async () => { await hook.result.current.submitNewClinic(newClinicInput); });
      expect(hook.result.current.state).toBe('selecting_tenant');
    };
    const draft = (opts: { save?: () => Promise<void> } = {}) => {
      const save = jest.fn(opts.save ?? (async () => {}));
      const discard = jest.fn();
      registerDraft({ id: 'rx', label: 'Prescription draft', save, discard }).setDirty(true);
      return { save, discard };
    };

    it('switching A -> B unwinds the stack (dismissAll) BEFORE the new clinic setup replaces the first screen', async () => {
      prepareSwitch('tenant-1');
      const hook = renderHook(() => useClinicEntryOrchestration());
      await reachChoice(hook);
      await act(async () => { await hook.result.current.chooseTenant('tenant-2'); });
      expect(mockDismissAll).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/onboarding/setup-wizard?tenantId=tenant-2');
      expect(mockDismissAll.mock.invocationCallOrder[0]).toBeLessThan(mockReplace.mock.invocationCallOrder[0]);
      expect(mockSetSelectedClinic).toHaveBeenCalledWith('tenant-2');
    });

    it('does nothing extra when there is nothing to dismiss', async () => {
      prepareSwitch('tenant-1');
      mockCanDismiss.mockReturnValue(false);
      const hook = renderHook(() => useClinicEntryOrchestration());
      await reachChoice(hook);
      await act(async () => { await hook.result.current.chooseTenant('tenant-2'); });
      expect(mockDismissAll).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/onboarding/setup-wizard?tenantId=tenant-2');
    });

    it('a FIRST clinic entry (no outgoing clinic) keeps today\'s behavior: a plain replace, no reset', async () => {
      prepareSwitch(null);
      const hook = renderHook(() => useClinicEntryOrchestration());
      await reachChoice(hook);
      await act(async () => { await hook.result.current.chooseTenant('tenant-2'); });
      expect(mockDismissAll).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it('re-entering the SAME clinic is not a switch: no reset', async () => {
      prepareSwitch('tenant-2');
      const hook = renderHook(() => useClinicEntryOrchestration());
      await reachChoice(hook);
      await act(async () => { await hook.result.current.chooseTenant('tenant-2'); });
      expect(mockDismissAll).not.toHaveBeenCalled();
    });

    describe('with an unsaved prescription draft in the outgoing clinic', () => {
      it('asks first: nothing is torn down (no queries cleared, no session refresh) until the user decides', async () => {
        prepareSwitch('tenant-1');
        draft();
        const hook = renderHook(() => useClinicEntryOrchestration());
        await reachChoice(hook);
        let pending!: Promise<void>;
        act(() => { pending = hook.result.current.chooseTenant('tenant-2'); });
        await act(async () => { await Promise.resolve(); });
        expect(isDecisionPending()).toBe(true);
        expect(getUnsavedWorkSnapshot().pending?.intent).toBe('exit');
        expect(queryClient.clear).not.toHaveBeenCalled();
        expect(mockRefreshTenant).not.toHaveBeenCalled();
        expect(mockDismissAll).not.toHaveBeenCalled();
        await act(async () => { await resolveUnsavedWorkDecision('cancel'); await pending; });
      });

      it('Cancel while choosing a clinic stays on the choice, draft kept, nothing torn down (no server switch); choosing again asks again', async () => {
        prepareSwitch('tenant-1');
        const { save, discard } = draft();
        const hook = renderHook(() => useClinicEntryOrchestration());
        await reachChoice(hook);
        let pending!: Promise<void>;
        act(() => { pending = hook.result.current.chooseTenant('tenant-2'); });
        await act(async () => { await Promise.resolve(); });
        await act(async () => { await resolveUnsavedWorkDecision('cancel'); await pending; });
        expect(hook.result.current.state).toBe('selecting_tenant');
        expect(save).not.toHaveBeenCalled();
        expect(discard).not.toHaveBeenCalled();
        expect(mockSelectTenant).not.toHaveBeenCalled(); // asked BEFORE the server-side tenant switch
        expect(mockRefreshTenant).not.toHaveBeenCalled();
        expect(mockReplace).not.toHaveBeenCalled();
        act(() => { void hook.result.current.chooseTenant('tenant-2'); });
        await act(async () => { await Promise.resolve(); });
        expect(isDecisionPending()).toBe(true); // asks again, no silent proceed
        await act(async () => { await resolveUnsavedWorkDecision('cancel'); });
      });

      it('Cancel during an automatic handoff gives a retryable error with the cancel message; retry asks again', async () => {
        prepareSwitch('tenant-1');
        mockCreateClinic.mockResolvedValue({ effectiveTenantId: 'tenant-2' });
        mockRefetchOrganization.mockReset().mockResolvedValue({ data: context('tenant-2', clinics) });
        draft();
        const hook = renderHook(() => useClinicEntryOrchestration());
        let pending!: Promise<void>;
        act(() => { pending = hook.result.current.submitNewClinic(newClinicInput); });
        await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
        await waitFor(() => expect(isDecisionPending()).toBe(true));
        await act(async () => { await resolveUnsavedWorkDecision('cancel'); await pending; });
        expect(hook.result.current.state).toBe('error');
        expect(hook.result.current.errorToken).toBe('errors.clinicEntry.switchCancelled');
        expect(mockRefreshTenant).not.toHaveBeenCalled();
        act(() => hook.result.current.retry());
        await waitFor(() => expect(isDecisionPending()).toBe(true));
        await act(async () => { await resolveUnsavedWorkDecision('discard'); });
        await waitFor(() => expect(hook.result.current.state).toBe('complete'));
        expect(mockDismissAll).toHaveBeenCalledTimes(1);
      });

      it('Discard then switches with the reset', async () => {
        prepareSwitch('tenant-1');
        const { discard } = draft();
        const hook = renderHook(() => useClinicEntryOrchestration());
        await reachChoice(hook);
        let pending!: Promise<void>;
        act(() => { pending = hook.result.current.chooseTenant('tenant-2'); });
        await act(async () => { await Promise.resolve(); });
        await act(async () => { await resolveUnsavedWorkDecision('discard'); await pending; });
        expect(discard).toHaveBeenCalledTimes(1);
        expect(mockDismissAll).toHaveBeenCalledTimes(1);
        expect(mockReplace).toHaveBeenCalledWith('/onboarding/setup-wizard?tenantId=tenant-2');
      });

      it('Save then switches only after the save succeeded', async () => {
        prepareSwitch('tenant-1');
        let release!: () => void;
        const { save } = draft({ save: () => new Promise<void>((resolve) => { release = resolve; }) });
        const hook = renderHook(() => useClinicEntryOrchestration());
        await reachChoice(hook);
        let pending!: Promise<void>;
        act(() => { pending = hook.result.current.chooseTenant('tenant-2'); });
        await act(async () => { await Promise.resolve(); });
        let deciding!: Promise<void>;
        await act(async () => { deciding = resolveUnsavedWorkDecision('save'); });
        expect(mockRefreshTenant).not.toHaveBeenCalled();
        await act(async () => { release(); await deciding; await pending; });
        expect(save).toHaveBeenCalledTimes(1);
        expect(mockDismissAll).toHaveBeenCalledTimes(1);
        expect(mockReplace).toHaveBeenCalledWith('/onboarding/setup-wizard?tenantId=tenant-2');
      });

      it('a dirty draft does NOT block a first entry or a same-clinic re-entry (no clinic switch)', async () => {
        prepareSwitch('tenant-2');
        draft();
        const hook = renderHook(() => useClinicEntryOrchestration());
        await reachChoice(hook);
        await act(async () => { await hook.result.current.chooseTenant('tenant-2'); });
        expect(isDecisionPending()).toBe(false);
        expect(mockReplace).toHaveBeenCalled();
      });
    });
  });
});
