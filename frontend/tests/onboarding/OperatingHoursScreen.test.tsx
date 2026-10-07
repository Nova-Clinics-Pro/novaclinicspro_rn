import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { axiosClient } from '../../core/api/axiosClient';
import { listOnboardingOperatingHoursApi } from '../../features/operatingHours/data/datasources/operatingHours.api';
import { operatingHoursKeys } from '../../features/operatingHours/data/repositories/operatingHours.repository.impl';
import { OperatingHoursScreen } from '../../features/onboarding/presentation/pages/steps/OperatingHoursScreen';
import { useWizardStore } from '../../features/onboarding/presentation/stores/wizard.store';

const mockRouterReplace = jest.fn();
const mockRouterBack = jest.fn();
const mockHoursQuery = jest.fn();
const mockSubmitStep = jest.fn();
const mockClearStepDraft = jest.fn().mockResolvedValue(undefined);

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockRouterReplace, back: mockRouterBack }),
}));

jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2F6F4E' },
      surface: { default: '#FFFFFF' },
      background: { default: '#F8F4EC' },
      border: { default: '#E5E7EB' },
      text: {
        primary: '#111827', secondary: '#6B7280', disabled: '#9CA3AF', onPrimary: '#FFFFFF',
      },
      feedback: { success: '#10B981', info: '#0EA5E9', infoLight: '#EFF6FF' },
    },
    spacing: { sm: 8, md: 16, lg: 24, xl: 32 },
    typography: {
      h4: { fontSize: 24 }, body1: { fontSize: 16 }, body2: { fontSize: 14 },
      button: { fontSize: 14 },
    },
  }),
}));

jest.mock('../../features/operatingHours/data/repositories/operatingHours.repository.impl', () => {
  const actual = jest.requireActual(
    '../../features/operatingHours/data/repositories/operatingHours.repository.impl'
  );
  return {
    ...actual,
    useOnboardingOperatingHoursQuery: (...args: unknown[]) => mockHoursQuery(...args),
  };
});

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useSubmitStepMutation: () => ({ mutateAsync: mockSubmitStep, isPending: false }),
}));

jest.mock('../../features/onboarding/presentation/stores/wizard.store', () => {
  const actual = jest.requireActual(
    '../../features/onboarding/presentation/stores/wizard.store'
  );
  return {
    ...actual,
    clearStepDraftAndSync: (...args: unknown[]) => mockClearStepDraft(...args),
  };
});

const mockGet = axiosClient.get as jest.Mock;

describe('OperatingHours onboarding datasource contract', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the canonical tenant-scoped endpoint and preserves named-day arrays', async () => {
    const schedule = [{ day: 'Wednesday', is_open: true, open_time: '10:00', close_time: '19:00' }];
    mockGet.mockResolvedValueOnce({ data: schedule });

    await expect(listOnboardingOperatingHoursApi('tenant-a')).resolves.toEqual(schedule);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/clinic/tenant-a/operating-hours');
  });

  it.each([{ items: [{ day_of_week: 0 }] }, null, undefined, 'invalid'])(
    'preserves the historical empty result for a successful non-array response',
    async (data) => {
      mockGet.mockResolvedValueOnce({ data });
      await expect(listOnboardingOperatingHoursApi('tenant-a')).resolves.toEqual([]);
    }
  );

  it('propagates read failures without fallback transport', async () => {
    const failure = { response: { status: 500 } };
    mockGet.mockRejectedValueOnce(failure);

    await expect(listOnboardingOperatingHoursApi('tenant-a')).rejects.toBe(failure);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('keeps onboarding query keys tenant-isolated', () => {
    expect(operatingHoursKeys.onboarding('tenant-a')).not.toEqual(
      operatingHoursKeys.onboarding('tenant-b')
    );
  });
});

describe('OperatingHoursScreen query boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWizardStore.getState().reset();
    mockHoursQuery.mockReturnValue({ isLoading: false, isError: false, data: [] });
    mockSubmitStep.mockResolvedValue({ next_step: 'next-step' });
  });

  afterEach(() => jest.useRealTimers());

  it('keeps the loading state while the canonical query is loading', () => {
    mockHoursQuery.mockReturnValue({ isLoading: true, isError: false });

    const { getByText } = render(<OperatingHoursScreen tenantId="tenant-a" />);

    expect(getByText('Loading operating hours...')).toBeTruthy();
    expect(mockHoursQuery).toHaveBeenCalledWith('tenant-a');
  });

  it('preserves source ordering and open/closed display semantics', async () => {
    mockHoursQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { day: 'Sunday', is_open: false, open_time: '09:00', close_time: '18:00' },
        { day: 'Monday', is_open: true, open_time: '08:30', close_time: '17:30' },
      ],
    });

    const { getByText, getAllByText } = render(
      <OperatingHoursScreen tenantId="tenant-a" />
    );

    await waitFor(() => expect(getByText('08:30 - 17:30')).toBeTruthy());
    expect(getAllByText('Closed')).toHaveLength(1);
  });

  it.each([
    { isLoading: false, isError: false, data: [] },
    { isLoading: false, isError: true, data: undefined },
  ])('restores the draft for empty or failed reads', async (queryResult) => {
    useWizardStore.getState().setStepDraft('operating_hours', {
      schedule: [{ day: 'Friday', is_open: true, open_time: '07:00', close_time: '12:00' }],
    });
    mockHoursQuery.mockReturnValue(queryResult);

    const { getByText } = render(<OperatingHoursScreen tenantId="tenant-a" />);

    await waitFor(() => expect(getByText('Unsaved changes restored')).toBeTruthy());
    expect(getByText('07:00 - 12:00')).toBeTruthy();
  });

  it('uses the Monday-to-Sunday default with Sunday closed', async () => {
    const { getByText, getAllByText } = render(
      <OperatingHoursScreen tenantId="tenant-a" />
    );

    await waitFor(() => expect(getByText('Monday')).toBeTruthy());
    expect(getByText('Sunday')).toBeTruthy();
    expect(getAllByText('09:00 - 18:00')).toHaveLength(6);
    expect(getAllByText('Closed')).toHaveLength(1);
  });

  it('autosaves the resolved schedule after 500ms', () => {
    jest.useFakeTimers();
    mockHoursQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{ day: 'Tuesday', is_open: true, open_time: '10:00', close_time: '16:00' }],
    });
    render(<OperatingHoursScreen tenantId="tenant-a" />);

    act(() => jest.advanceTimersByTime(500));

    expect(useWizardStore.getState().getStepData('operating_hours')).toEqual({
      schedule: [{ day: 'Tuesday', is_open: true, open_time: '10:00', close_time: '16:00' }],
    });
  });

  it('submits the whole schedule before clearing the draft and navigating', async () => {
    const schedule = [{ day: 'Monday', is_open: true, open_time: '09:00', close_time: '18:00' }];
    mockHoursQuery.mockReturnValue({ isLoading: false, isError: false, data: schedule });
    const { getByText } = render(<OperatingHoursScreen tenantId="tenant-a" />);

    fireEvent.press(getByText('Confirm & Continue'));

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalled());
    expect(mockSubmitStep).toHaveBeenCalledWith({
      data: { operating_hours: schedule },
      mark_complete: true,
    });
    expect(mockClearStepDraft).toHaveBeenCalledWith('operating_hours');
    expect(mockSubmitStep.mock.invocationCallOrder[0]).toBeLessThan(
      mockClearStepDraft.mock.invocationCallOrder[0]
    );
    expect(mockClearStepDraft.mock.invocationCallOrder[0]).toBeLessThan(
      mockRouterReplace.mock.invocationCallOrder[0]
    );
    expect(mockRouterReplace).toHaveBeenCalledWith(
      '/onboarding/step-detail?tenantId=tenant-a&stepCode=next-step'
    );
  });

  it('uses the wizard callback after successful completion instead of navigating', async () => {
    const onSuccess = jest.fn();
    const { getByText } = render(
      <OperatingHoursScreen tenantId="tenant-a" isWizardMode onSuccess={onSuccess} />
    );

    fireEvent.press(getByText('Confirm & Continue'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('does not clear drafts, navigate, or invoke success when completion fails', async () => {
    const onSuccess = jest.fn();
    mockSubmitStep.mockRejectedValueOnce(new Error('submission failed'));
    const { getByText } = render(
      <OperatingHoursScreen tenantId="tenant-a" isWizardMode onSuccess={onSuccess} />
    );

    fireEvent.press(getByText('Confirm & Continue'));

    await waitFor(() => expect(mockSubmitStep).toHaveBeenCalled());
    expect(mockClearStepDraft).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('contains no direct presentation transport', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../features/onboarding/presentation/pages/steps/OperatingHoursScreen.tsx'
      ),
      'utf8'
    );
    expect(source).not.toMatch(/axiosClient|\bfetch\s*\(|\/api\/v1\//);
  });
});
