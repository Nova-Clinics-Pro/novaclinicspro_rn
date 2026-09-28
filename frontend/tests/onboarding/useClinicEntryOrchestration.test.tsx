import { act, renderHook, waitFor } from '@testing-library/react-native';

import { queryClient } from '../../core/api/queryClient';
import { useClinicEntryOrchestration } from '../../features/onboarding/presentation/hooks/useClinicEntryOrchestration';

const mockReplace = jest.fn();
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
  useRouter: () => ({ replace: mockReplace }),
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
});
