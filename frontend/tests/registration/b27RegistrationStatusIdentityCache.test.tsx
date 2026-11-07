import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { getRegistrationStatusApi } from '../../features/registration/data/datasources/registration.api';
import type { RegistrationStatus } from '../../features/registration/domain/entities/registration.entity';
import {
  registrationStatusKeys,
  useRegistrationStatus,
} from '../../features/registration/presentation/hooks/useRegistrationStatus';
import { useAuthStore } from '../../features/auth/presentation/providers/auth.store';

jest.mock('../../features/registration/data/datasources/registration.api', () => ({
  getRegistrationStatusApi: jest.fn(),
  registerClinicOwnerApi: jest.fn(),
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
};

const applicant = (userId: string) => ({
  id: userId,
  userId,
  email: `${userId}@example.com`,
  fullName: userId,
  tenantId: null,
  isOrgAdmin: false,
  applicationStatus: 'approved',
  roles: [],
  ownedClinics: [],
});

const approved = (applicationId: string): RegistrationStatus => ({
  status: 'approved',
  action_required: false,
  updated_at: '2026-10-19T00:00:00Z',
  continuation: {
    kind: 'approved_choice',
    application_id: applicationId,
    tenant_name: `${applicationId} clinic`,
  },
});

describe('B2.7-CS-002 registration-status authenticated identity cache isolation', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
    useAuthStore.setState({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      selectedClinicId: null,
    });
  });

  afterEach(() => {
    cleanup();
    act(() => {
      queryClient.clear();
      useAuthStore.setState({
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
        selectedClinicId: null,
      });
    });
  });

  it('does not expose applicant A continuation to applicant B while B status is still pending', async () => {
    const applicantA = deferred<RegistrationStatus>();
    const applicantB = deferred<RegistrationStatus>();
    (getRegistrationStatusApi as jest.Mock)
      .mockReturnValueOnce(applicantA.promise)
      .mockReturnValueOnce(applicantB.promise);

    useAuthStore.setState({ currentUser: applicant('applicant-a'), isAuthenticated: true });
    const { result } = renderHook(() => useRegistrationStatus(), { wrapper });

    await waitFor(() => expect(getRegistrationStatusApi).toHaveBeenCalledTimes(1));
    await act(async () => {
      applicantA.resolve(approved('application-a'));
    });
    await waitFor(() => {
      expect(result.current.data?.continuation?.application_id).toBe('application-a');
    });

    act(() => {
      useAuthStore.setState({ currentUser: applicant('applicant-b'), isAuthenticated: true });
    });

    await waitFor(() => expect(getRegistrationStatusApi).toHaveBeenCalledTimes(2));
    expect(result.current.data).toBeUndefined();

    await act(async () => {
      applicantB.resolve(approved('application-b'));
    });
    await waitFor(() => {
      expect(result.current.data?.continuation?.application_id).toBe('application-b');
    });
  });

  it('keeps an in-flight applicant A response out of applicant B cache after an identity change', async () => {
    const applicantA = deferred<RegistrationStatus>();
    const applicantB = deferred<RegistrationStatus>();
    (getRegistrationStatusApi as jest.Mock)
      .mockReturnValueOnce(applicantA.promise)
      .mockReturnValueOnce(applicantB.promise);

    useAuthStore.setState({ currentUser: applicant('applicant-a'), isAuthenticated: true });
    const { result } = renderHook(() => useRegistrationStatus(), { wrapper });
    await waitFor(() => expect(getRegistrationStatusApi).toHaveBeenCalledTimes(1));

    act(() => {
      useAuthStore.setState({ currentUser: applicant('applicant-b'), isAuthenticated: true });
    });
    await waitFor(() => expect(getRegistrationStatusApi).toHaveBeenCalledTimes(2));
    expect(result.current.data).toBeUndefined();

    await act(async () => {
      applicantA.resolve(approved('application-a'));
    });
    expect(result.current.data).toBeUndefined();

    await act(async () => {
      applicantB.resolve(approved('application-b'));
    });
    await waitFor(() => {
      expect(result.current.data?.continuation?.application_id).toBe('application-b');
    });
  });

  it('does not expose cached applicant A data when applicant B status fails', async () => {
    (getRegistrationStatusApi as jest.Mock)
      .mockResolvedValueOnce(approved('application-a'))
      .mockRejectedValueOnce(new Error('applicant-b status unavailable'));

    useAuthStore.setState({ currentUser: applicant('applicant-a'), isAuthenticated: true });
    const { result } = renderHook(() => useRegistrationStatus(), { wrapper });
    await waitFor(() => {
      expect(result.current.data?.continuation?.application_id).toBe('application-a');
    });

    act(() => {
      useAuthStore.setState({ currentUser: applicant('applicant-b'), isAuthenticated: true });
    });
    await waitFor(() => expect(getRegistrationStatusApi).toHaveBeenCalledTimes(2));
    expect(result.current.data).toBeUndefined();
  });

  it('keeps the same identity cache through a token refresh and disables the query when unauthenticated', async () => {
    (getRegistrationStatusApi as jest.Mock)
      .mockResolvedValueOnce(approved('application-a'))
      .mockResolvedValueOnce(approved('application-b'));
    useAuthStore.setState({ currentUser: applicant('applicant-a'), isAuthenticated: true });
    const { result } = renderHook(() => useRegistrationStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.continuation?.application_id).toBe('application-a');
    });
    expect(getRegistrationStatusApi).toHaveBeenCalledTimes(1);

    act(() => {
      useAuthStore.setState({ currentUser: applicant('applicant-a'), isAuthenticated: true });
    });
    expect(result.current.data?.continuation?.application_id).toBe('application-a');
    expect(getRegistrationStatusApi).toHaveBeenCalledTimes(1);

    act(() => {
      useAuthStore.setState({ currentUser: null, isAuthenticated: false });
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();

    act(() => {
      useAuthStore.setState({ currentUser: applicant('applicant-b'), isAuthenticated: true });
    });
    await waitFor(() => {
      expect(result.current.data?.continuation?.application_id).toBe('application-b');
    });
    expect(getRegistrationStatusApi).toHaveBeenCalledTimes(2);
  });

  it('uses only the authenticated user identity in the status query key', () => {
    const applicantAKey = registrationStatusKeys.status('applicant-a');
    const applicantBKey = registrationStatusKeys.status('applicant-b');

    expect(applicantAKey).toEqual(['registration-status', 'authenticated-applicant', 'applicant-a']);
    expect(applicantBKey).toEqual(['registration-status', 'authenticated-applicant', 'applicant-b']);
    expect(applicantAKey).not.toEqual(applicantBKey);
  });
});
