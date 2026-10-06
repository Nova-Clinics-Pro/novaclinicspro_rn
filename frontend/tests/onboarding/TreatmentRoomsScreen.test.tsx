import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { axiosClient } from '../../core/api/axiosClient';
import { listOnboardingRoomsApi } from '../../features/rooms/data/datasources/rooms.api';
import { TreatmentRoomsScreen } from '../../features/onboarding/presentation/pages/steps/TreatmentRoomsScreen';
import { useWizardStore } from '../../features/onboarding/presentation/stores/wizard.store';

const mockRouterReplace = jest.fn();
const mockRouterBack = jest.fn();
const mockRoomsQuery = jest.fn();
const mockSubmitStep = jest.fn();

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockRouterReplace, back: mockRouterBack }),
}));

jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2F6F4E', soft: '#E7F2EC' },
      surface: { default: '#FFFFFF', elevated: '#F9FAFB' },
      background: { default: '#F8F4EC' },
      border: { default: '#E5E7EB' },
      text: {
        primary: '#111827',
        secondary: '#6B7280',
        disabled: '#9CA3AF',
        onPrimary: '#FFFFFF',
      },
      feedback: { info: '#0EA5E9', infoLight: '#EFF6FF', error: '#EF4444' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    typography: {
      h4: { fontSize: 24 },
      h6: { fontSize: 16 },
      body2: { fontSize: 14 },
      caption: { fontSize: 12 },
      button: { fontSize: 14 },
    },
  }),
}));

jest.mock('../../features/rooms/data/repositories/rooms.repository.impl', () => ({
  useOnboardingRoomsQuery: (...args: unknown[]) => mockRoomsQuery(...args),
}));

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useSubmitStepMutation: () => ({ mutateAsync: mockSubmitStep, isPending: false }),
}));

jest.mock('../../features/onboarding/presentation/stores/wizard.store', () => {
  const actual = jest.requireActual(
    '../../features/onboarding/presentation/stores/wizard.store'
  );
  return {
    ...actual,
    clearStepDraftAndSync: jest.fn().mockResolvedValue(undefined),
  };
});

const mockGet = axiosClient.get as jest.Mock;

describe('TreatmentRooms datasource contract', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    [[{ id: 'array-room' }]],
    [{ items: [{ id: 'items-room' }] }],
    [{ data: [{ id: 'data-room' }] }],
  ])('normalizes supported successful primary response shapes without fallback', async (data) => {
    mockGet.mockResolvedValueOnce({ data });

    await expect(listOnboardingRoomsApi('tenant-a')).resolves.toHaveLength(1);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/clinic/tenant-a/rooms');
  });

  it('uses the tenant-scoped treatment-rooms fallback only for primary 404', async () => {
    mockGet
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { data: [{ id: 'fallback-room' }] } });

    await expect(listOnboardingRoomsApi('tenant-b')).resolves.toEqual([
      { id: 'fallback-room' },
    ]);
    expect(mockGet.mock.calls).toEqual([
      ['/api/v1/clinic/tenant-b/rooms'],
      ['/api/v1/clinic/tenant-b/treatment-rooms'],
    ]);
  });

  it('does not invoke fallback for an empty or malformed successful response', async () => {
    mockGet.mockResolvedValueOnce({ data: { unexpected: true } });

    await expect(listOnboardingRoomsApi('tenant-a')).resolves.toEqual([]);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('does not invoke fallback for a non-404 failure', async () => {
    const failure = { response: { status: 403 } };
    mockGet.mockRejectedValueOnce(failure);

    await expect(listOnboardingRoomsApi('tenant-a')).rejects.toBe(failure);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

describe('TreatmentRoomsScreen query boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWizardStore.getState().reset();
    mockRoomsQuery.mockReturnValue({ isLoading: false, isError: false, data: [] });
    mockSubmitStep.mockResolvedValue({ next_step: 'next-step' });
  });

  it('keeps the loading state while the canonical room query is loading', () => {
    mockRoomsQuery.mockReturnValue({ isLoading: true, isError: false });

    const { getByText } = render(<TreatmentRoomsScreen tenantId="tenant-a" />);

    expect(getByText('Loading rooms data...')).toBeTruthy();
  });

  it('maps canonical room data into the existing form', async () => {
    mockRoomsQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{ id: 'room-1', name: 'Panchakarma', type: 'treatment', capacity: 3 }],
    });

    const { getByDisplayValue } = render(<TreatmentRoomsScreen tenantId="tenant-a" />);

    await waitFor(() => expect(getByDisplayValue('Panchakarma')).toBeTruthy());
    expect(getByDisplayValue('3')).toBeTruthy();
    expect(mockRoomsQuery).toHaveBeenCalledWith('tenant-a');
  });

  it.each([
    { isLoading: false, isError: false, data: [] },
    { isLoading: false, isError: true, data: undefined },
  ])('restores the current-step draft for empty or failed reads', async (queryResult) => {
    useWizardStore.getState().setStepDraft('treatment_rooms', {
      rooms: [{ name: 'Draft Room', room_type: 'consultation', capacity: 2 }],
    });
    mockRoomsQuery.mockReturnValue(queryResult);

    const { getByText, getByDisplayValue } = render(
      <TreatmentRoomsScreen tenantId="tenant-a" />
    );

    await waitFor(() => expect(getByText('Unsaved changes restored')).toBeTruthy());
    expect(getByDisplayValue('Draft Room')).toBeTruthy();
    expect(getByDisplayValue('2')).toBeTruthy();
  });

  it('falls back to the legacy draft alias when the current-step draft is absent', async () => {
    useWizardStore.getState().setStepDraft('rooms_and_therapy_beds', {
      rooms: [{ name: 'Legacy Draft', room_type: 'therapy', capacity: 4 }],
    });

    const { getByDisplayValue } = render(
      <TreatmentRoomsScreen tenantId="tenant-a" stepCode="treatment_rooms" />
    );

    await waitFor(() => expect(getByDisplayValue('Legacy Draft')).toBeTruthy());
  });

  it('retains the single default room when the read is empty and no draft exists', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TreatmentRoomsScreen tenantId="tenant-a" />
    );

    await waitFor(() => expect(getByText('Add Treatment Rooms')).toBeTruthy());
    expect(getByPlaceholderText('e.g., Consultation Room 1').props.value).toBe('');
  });

  it('submits normalized rooms through the existing onboarding completion mutation', async () => {
    mockRoomsQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{ id: 'room-1', name: 'Consultation 1', room_type: 'consultation', capacity: 2 }],
    });
    const { getByDisplayValue, getByText } = render(
      <TreatmentRoomsScreen tenantId="tenant-a" />
    );
    await waitFor(() => expect(getByDisplayValue('Consultation 1')).toBeTruthy());

    fireEvent.press(getByText('Save & Continue'));

    await waitFor(() =>
      expect(mockSubmitStep).toHaveBeenCalledWith({
        data: {
          rooms: [
            { name: 'Consultation 1', room_type: 'consultation', capacity: 2 },
          ],
        },
        mark_complete: true,
      })
    );
  });

  it('contains no direct presentation transport', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../features/onboarding/presentation/pages/steps/TreatmentRoomsScreen.tsx'
      ),
      'utf8'
    );
    expect(source).not.toMatch(/axiosClient|\bfetch\s*\(|\/api\/v1\//);
  });
});
