/**
 * TreatmentPlansTab — "Send to Scheduling" status transitions.
 *
 * Covers the render-phase `sentSuccessfully` adjustment that replaced an effect (lint remediation,
 * react-hooks/set-state-in-effect), and confirms the effect that stayed (alerts, mutation reset, refetch,
 * parent refresh) still fires exactly once per transition. The real component is rendered here; the
 * existing consultation tests mock it away.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { TreatmentPlansTab } from '../../../features/episodes/presentation/components/TreatmentPlansTab';

const mockSend = {
  status: 'idle' as string,
  errorMessage: null as string | null,
};
const mockMutate = jest.fn();
const mockReset = jest.fn();
const mockRefetchOrder = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../../features/treatmentSheets/data/repositories/treatmentOrders.repository.impl', () => ({
  useSendToSchedulingMutation: () => ({
    mutate: mockMutate,
    status: mockSend.status,
    errorMessage: mockSend.errorMessage,
    currentVersion: null,
    reset: mockReset,
  }),
  // The order query keeps reporting an unsent DRAFT order, as it would until the refetch lands.
  useTreatmentOrderQuery: () => ({
    data: { is_order: false, state: 'DRAFT' },
    isFetched: true,
    isError: false,
    refetch: mockRefetchOrder,
  }),
}));
jest.mock('../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl', () => ({
  useCreateTreatmentSheetMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));


const SHEET: any = {
  id: 'sheet-1',
  tenant_id: 't1',
  case_sheet_id: 'cs-1',
  appointment_id: null,
  encounter_id: null,
  duration_days: 14,
  status: 'DRAFT',
  document_version: 1,
  version: 4,
  recorded_at: '2026-01-01T00:00:00Z',
  recorded_by_staff_id: null,
  signed_by_staff_id: null,
};

const onRefreshSheet = jest.fn();

const renderTab = () => {
  const make = () => (
    <TreatmentPlansTab
      sheet={SHEET}
      hasTreatmentSheet
      isLoading={false}
      isError={false}
      canCreate={false}
      canSchedule={false}
      tenantId="t1"
      casesheetId="cs-1"
      onRetry={jest.fn()}
      onOpenSheet={jest.fn()}
      onScheduleSheet={jest.fn()}
      onSheetCreated={jest.fn()}
      onRefreshSheet={onRefreshSheet}
    />
  );
  const utils = render(make());
  // A fresh element each time so the re-render actually re-reads the mocked hooks.
  const setStatus = async (status: string, errorMessage: string | null = null) => {
    mockSend.status = status;
    mockSend.errorMessage = errorMessage;
    await act(async () => { utils.rerender(make()); });
  };
  return { ...utils, setStatus };
};

const SEND = 'Send to Scheduling';

describe('TreatmentPlansTab — send to scheduling', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSend.status = 'idle';
    mockSend.errorMessage = null;
    [mockMutate, mockReset, mockRefetchOrder, onRefreshSheet].forEach(f => f.mockClear());
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined); // theme-provider fallback notice
  });
  afterEach(() => jest.restoreAllMocks());

  it('offers "Send to Scheduling" for an unsent draft plan and sends with the sheet version', () => {
    const u = renderTab();
    fireEvent.press(u.getByText(SEND));
    expect(mockMutate).toHaveBeenCalledWith({ sheetId: 'sheet-1', version: 4 });
  });

  it('shows a disabled "Sending…" state while the request is in flight', async () => {
    const u = renderTab();
    await u.setStatus('sending');
    expect(u.getByText('Sending…')).toBeTruthy();
    expect(u.queryByText(SEND)).toBeNull();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('hides the send button as soon as the send succeeds, even before the order refetch lands', async () => {
    const u = renderTab();
    await u.setStatus('sending');
    await u.setStatus('success');
    expect(u.queryByText(SEND)).toBeNull();
    expect(u.queryByText('Sending…')).toBeNull();
  });

  it('on success: resets the mutation, refetches the order and refreshes the parent once, with no alert', async () => {
    const u = renderTab();
    await u.setStatus('success');
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockRefetchOrder).toHaveBeenCalledTimes(1);
    expect(onRefreshSheet).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('keeps the button hidden after the mutation returns to idle', async () => {
    const u = renderTab();
    await u.setStatus('success');
    await u.setStatus('idle');
    expect(u.queryByText(SEND)).toBeNull();
    // and does not refetch/refresh again on the idle transition
    expect(mockRefetchOrder).toHaveBeenCalledTimes(1);
    expect(onRefreshSheet).toHaveBeenCalledTimes(1);
  });

  it('on error: alerts with the message, resets, and keeps the send button available to retry', async () => {
    const u = renderTab();
    await u.setStatus('sending');
    await u.setStatus('error', 'Could not send');
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Could not send');
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockRefetchOrder).not.toHaveBeenCalled();
    expect(onRefreshSheet).not.toHaveBeenCalled();
    await u.setStatus('idle');
    expect(u.getByText(SEND)).toBeTruthy();
  });

  it('on conflict: alerts, keeps the button, and only resets + refreshes when the user acknowledges', async () => {
    const u = renderTab();
    await u.setStatus('conflict', 'Plan changed elsewhere');
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Plan Updated');
    expect(message).toBe('Plan changed elsewhere');
    expect(u.getByText(SEND)).toBeTruthy();
    expect(mockReset).not.toHaveBeenCalled();
    expect(onRefreshSheet).not.toHaveBeenCalled();

    act(() => { buttons[0].onPress(); });
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(onRefreshSheet).toHaveBeenCalledTimes(1);
  });

  it('a failed attempt followed by a successful one ends hidden (no stale error state)', async () => {
    const u = renderTab();
    await u.setStatus('error', 'Could not send');
    await u.setStatus('idle');
    expect(u.getByText(SEND)).toBeTruthy();
    await u.setStatus('success');
    expect(u.queryByText(SEND)).toBeNull();
  });
});
