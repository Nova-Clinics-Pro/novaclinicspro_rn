import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import mockEnUS from '../../core/localization/translations/en-US.json';
import { getApplicationDetailApi } from '../../features/onboarding/data/datasources/onboarding.api';
import { ChoiceScreen } from '../../features/onboarding/presentation/pages/ChoiceScreen';

const mockReplace = jest.fn();
const mockSetCurrentApplicationId = jest.fn();
const mockUseRegistrationStatus = jest.fn();
const mockUseAuth = jest.fn();
const mockUseClinicEntryOrchestration = jest.fn();
const mockRefetch = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#primary', soft: '#primary-soft', onPrimary: '#on-primary' },
      background: { default: '#background' },
      surface: { default: '#surface' },
      border: { default: '#border' },
      text: { primary: '#primary-text', secondary: '#secondary-text', tertiary: '#tertiary-text' },
      feedback: { success: '#success', info: '#info', infoLight: '#info-light', error: '#error' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
      h3: { fontSize: 24 }, h5: { fontSize: 18 }, h6: { fontSize: 16 },
      body1: { fontSize: 16 }, body2: { fontSize: 14 }, caption: { fontSize: 12 },
    },
  }),
}));

jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key.split('.').reduce((value: any, segment) => value?.[segment], mockEnUS) ?? key,
  }),
}));

jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../features/registration/presentation/hooks/useRegistrationStatus', () => ({
  useRegistrationStatus: (...args: unknown[]) => mockUseRegistrationStatus(...args),
}));

jest.mock('../../features/onboarding/presentation/providers/onboarding.store', () => ({
  useOnboardingStore: () => ({ setCurrentApplicationId: mockSetCurrentApplicationId }),
}));

jest.mock('../../features/onboarding/presentation/hooks/useClinicEntryOrchestration', () => ({
  useClinicEntryOrchestration: () => mockUseClinicEntryOrchestration(),
}));

jest.mock('../../features/onboarding/data/datasources/onboarding.api', () => {
  const actual = jest.requireActual('../../features/onboarding/data/datasources/onboarding.api');
  return { ...actual, getApplicationDetailApi: jest.fn() };
});

const mockGetApplicationDetailApi = getApplicationDetailApi as jest.MockedFunction<typeof getApplicationDetailApi>;

const APPLICANT_A = '00000000-0000-4000-8000-000000000001';
const APPLICANT_B = '00000000-0000-4000-8000-000000000002';
const APPLICATION_A = '11111111-1111-4111-8111-111111111111';
const APPLICATION_B = '22222222-2222-4222-8222-222222222222';

const applicant = (userId: string) => ({ userId, applicationStatus: 'approved' });
const status = (value: unknown) => ({
  data: value,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
});
const approvedStatus = (applicationId: string, tenantName: string) => status({
  status: 'approved',
  action_required: false,
  updated_at: '2026-10-20T00:00:00Z',
  continuation: { kind: 'approved_choice', application_id: applicationId, tenant_name: tenantName },
});
const detail = (id: string, tenantName: string) => ({ id, tenant_name: tenantName }) as Awaited<ReturnType<typeof getApplicationDetailApi>>;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
};

describe('B2.7-CS-006-R2 ChoiceScreen real application-detail query boundary', () => {
  let queryClient: QueryClient;

  const renderScreen = () => render(
    <QueryClientProvider client={queryClient}>
      <ChoiceScreen />
    </QueryClientProvider>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
    mockUseAuth.mockReturnValue({ currentUser: applicant(APPLICANT_A) });
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseRegistrationStatus.mockReturnValue(approvedStatus(APPLICATION_A, 'Applicant A Clinic'));
    mockUseClinicEntryOrchestration.mockReturnValue({
      state: 'idle', errorToken: null, organizations: [], organizationId: 'org-1',
      setSelectedOrganizationId: jest.fn(), tenantChoices: [], isLoadingContext: false,
      contextError: null, submitNewClinic: jest.fn(), submitBringClinic: jest.fn(),
      resumePending: jest.fn(), chooseTenant: jest.fn(), retry: jest.fn(), logout: jest.fn(), resetOperation: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  it.each([
    ['missing continuation', status({ status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z' })],
    ['null continuation', status({ status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z', continuation: null })],
    ['empty continuation', status({ status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z', continuation: {} })],
    ['wrong kind', status({ status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z', continuation: { kind: 'other', application_id: APPLICATION_A, tenant_name: 'Applicant A Clinic' } })],
    ['missing application ID', status({ status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z', continuation: { kind: 'approved_choice', tenant_name: 'Applicant A Clinic' } })],
    ['empty application ID', status({ status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z', continuation: { kind: 'approved_choice', application_id: '', tenant_name: 'Applicant A Clinic' } })],
    ['invalid UUID', status({ status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z', continuation: { kind: 'approved_choice', application_id: 'invalid', tenant_name: 'Applicant A Clinic' } })],
    ['missing tenant name', status({ status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z', continuation: { kind: 'approved_choice', application_id: APPLICATION_A } })],
    ['blank tenant name', status({ status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z', continuation: { kind: 'approved_choice', application_id: APPLICATION_A, tenant_name: '' } })],
    ['whitespace tenant name', status({ status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z', continuation: { kind: 'approved_choice', application_id: APPLICATION_A, tenant_name: '  ' } })],
    ['nonapproved status', status({ status: 'pending_review', action_required: false, updated_at: '2026-10-20T00:00:00Z', continuation: { kind: 'approved_choice', application_id: APPLICATION_A, tenant_name: 'Applicant A Clinic' } })],
    ['unresolved status', { data: undefined, isLoading: true, error: null, refetch: mockRefetch }],
  ])('does not invoke the real datasource for %s', async (_scenario, registrationStatus) => {
    mockUseRegistrationStatus.mockReturnValue(registrationStatus);

    renderScreen();
    await act(async () => { await Promise.resolve(); });

    expect(mockGetApplicationDetailApi).not.toHaveBeenCalled();
  });

  it('does not invoke the real datasource without an authenticated applicant', async () => {
    mockUseAuth.mockReturnValue({ currentUser: undefined });

    renderScreen();
    await act(async () => { await Promise.resolve(); });

    expect(mockGetApplicationDetailApi).not.toHaveBeenCalled();
  });

  it('does not let a route-supplied ID invoke the datasource without a trusted continuation', async () => {
    mockUseLocalSearchParams.mockReturnValue({ applicationId: APPLICATION_B });
    mockUseRegistrationStatus.mockReturnValue(status({
      status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z',
    }));

    renderScreen();
    await act(async () => { await Promise.resolve(); });

    expect(mockGetApplicationDetailApi).not.toHaveBeenCalled();
  });

  it('uses only the validated continuation ID for the real datasource request', async () => {
    mockGetApplicationDetailApi.mockResolvedValue(detail(APPLICATION_A, 'Applicant A Clinic'));

    const screen = renderScreen();

    await waitFor(() => expect(mockGetApplicationDetailApi).toHaveBeenCalledWith(APPLICATION_A));
    expect(mockGetApplicationDetailApi).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Applicant A Clinic')).toBeTruthy());
  });

  it('keeps a delayed applicant A result out of applicant B Choice context', async () => {
    const pendingA = deferred<Awaited<ReturnType<typeof getApplicationDetailApi>>>();
    mockGetApplicationDetailApi.mockReturnValueOnce(pendingA.promise).mockResolvedValueOnce(detail(APPLICATION_B, 'Applicant B Clinic'));

    const screen = renderScreen();
    await waitFor(() => expect(mockGetApplicationDetailApi).toHaveBeenCalledWith(APPLICATION_A));

    mockUseAuth.mockReturnValue({ currentUser: applicant(APPLICANT_B) });
    mockUseRegistrationStatus.mockReturnValue(approvedStatus(APPLICATION_B, 'Applicant B Clinic'));
    screen.rerender(<QueryClientProvider client={queryClient}><ChoiceScreen /></QueryClientProvider>);
    await waitFor(() => expect(mockGetApplicationDetailApi).toHaveBeenCalledWith(APPLICATION_B));

    await act(async () => { pendingA.resolve(detail(APPLICATION_A, 'Applicant A Clinic')); });
    await waitFor(() => expect(screen.getByText('Applicant B Clinic')).toBeTruthy());
    expect(screen.queryByText('Applicant A Clinic')).toBeNull();
  });

  it('does not expose a delayed applicant A result after logout', async () => {
    const pendingA = deferred<Awaited<ReturnType<typeof getApplicationDetailApi>>>();
    mockGetApplicationDetailApi.mockReturnValueOnce(pendingA.promise);

    const screen = renderScreen();
    await waitFor(() => expect(mockGetApplicationDetailApi).toHaveBeenCalledWith(APPLICATION_A));

    mockUseAuth.mockReturnValue({ currentUser: undefined });
    screen.rerender(<QueryClientProvider client={queryClient}><ChoiceScreen /></QueryClientProvider>);
    await act(async () => { pendingA.resolve(detail(APPLICATION_A, 'Applicant A Clinic')); });

    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText('Applicant A Clinic')).toBeNull();
    expect(mockGetApplicationDetailApi).toHaveBeenCalledTimes(1);
  });

  it('does not let a delayed applicant A result populate applicant B with an invalid continuation', async () => {
    const pendingA = deferred<Awaited<ReturnType<typeof getApplicationDetailApi>>>();
    mockGetApplicationDetailApi.mockReturnValueOnce(pendingA.promise);

    const screen = renderScreen();
    await waitFor(() => expect(mockGetApplicationDetailApi).toHaveBeenCalledWith(APPLICATION_A));

    mockUseAuth.mockReturnValue({ currentUser: applicant(APPLICANT_B) });
    mockUseRegistrationStatus.mockReturnValue(status({
      status: 'approved', action_required: false, updated_at: '2026-10-20T00:00:00Z',
      continuation: { kind: 'approved_choice', application_id: 'invalid', tenant_name: 'Applicant B Clinic' },
    }));
    screen.rerender(<QueryClientProvider client={queryClient}><ChoiceScreen /></QueryClientProvider>);
    await act(async () => { pendingA.resolve(detail(APPLICATION_A, 'Applicant A Clinic')); });

    await act(async () => { await Promise.resolve(); });
    expect(mockGetApplicationDetailApi).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Applicant A Clinic')).toBeNull();
  });
});
