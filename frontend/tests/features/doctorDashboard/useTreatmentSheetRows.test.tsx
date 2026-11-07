import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useTreatmentSheetRows } from '../../../features/treatmentSheets/presentation/pages/detail/useTreatmentSheetRows';
import {
  updateAllTreatmentSheetRowsApi,
  updateTreatmentSheetRowApi,
} from '../../../features/treatmentSheets/data/datasources/treatmentSheets.api';
import { TreatmentSheetResponse } from '../../../features/treatmentSheets/data/models/treatmentSheets.dtos';

/**
 * R7 · T-0.7 (ED-ARCH-001) — CHARACTERIZATION, created before production
 * remediation, per the task's Characterization-First Gate. Locks
 * `useTreatmentSheetRows`'s current observable behavior (row loading/
 * ordering, single-row and bulk save success/failure, scheduled-date
 * preservation) BEFORE its internal data-access calls are repointed
 * through governed repository hooks — so the repoint can be verified
 * behavior-preserving rather than assumed.
 *
 * Mocks at the datasource-function boundary (`updateTreatmentSheetRowApi`/
 * `updateAllTreatmentSheetRowsApi`) — the same boundary the T-0.7 repository
 * wrappers' own `mutationFn`s will still call internally, so these tests
 * remain valid, unmodified, both before and after the repoint (the same
 * transparent-pass-through principle established in T-0.2 through T-0.6).
 */

jest.mock('../../../features/treatmentSheets/data/datasources/treatmentSheets.api', () => ({
  updateAllTreatmentSheetRowsApi: jest.fn(),
  updateTreatmentSheetRowApi: jest.fn(),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const buildSheet = (rows: Partial<TreatmentSheetResponse['rows'][number]>[]): TreatmentSheetResponse =>
  ({
    id: 'sheet-1',
    rows: rows.map((r, i) => ({
      id: `row-${i + 1}`,
      treatment_sheet_id: 'sheet-1',
      day_number: i + 1,
      session_date: null,
      session_id: null,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      ...r,
    })),
  }) as TreatmentSheetResponse;

describe('useTreatmentSheetRows (R7 · T-0.7 characterization)', () => {
  let refetch: jest.Mock;
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    refetch = jest.fn().mockResolvedValue(undefined);
    (updateTreatmentSheetRowApi as jest.Mock).mockResolvedValue({ id: 'sheet-1' });
    (updateAllTreatmentSheetRowsApi as jest.Mock).mockResolvedValue({ id: 'sheet-1' });
  });

  it('CHARACTERIZATION: builds rowsData from treatmentSheet.rows in the same order, preserving day_number/session_date/session_id/scheduled_time/therapist_id', () => {
    const treatmentSheet = buildSheet([
      { day_number: 1, session_date: '2026-07-05', session_id: 'session-1', scheduled_time: '09:00:00', therapist_id: 'staff-1', treatment_description: 'Abhyanga' },
      { day_number: 2, session_date: null, session_id: null },
    ]);

    const { result } = renderHook(() =>
      useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: 'sheet-1', treatmentSheet, refetch }),
    { wrapper });

    expect(result.current.rowsData.map((r) => r.day_number)).toEqual([1, 2]);
    expect(result.current.rowsData[0]).toEqual(
      expect.objectContaining({
        id: 'row-1',
        day_number: 1,
        session_date: '2026-07-05',
        session_id: 'session-1',
        scheduled_time: '09:00:00',
        therapist_id: 'staff-1',
        treatment_name: 'Abhyanga',
      }),
    );
    expect(result.current.rowsData[1]).toEqual(
      expect.objectContaining({ id: 'row-2', day_number: 2, session_date: null, session_id: null }),
    );
  });

  it('CHARACTERIZATION: hasBeenSavedOnce is true only when at least one row already carries saved clinical content', () => {
    const withContent = buildSheet([{ treatment_description: 'Abhyanga' }]);
    const { result: withResult } = renderHook(() =>
      useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: 'sheet-1', treatmentSheet: withContent, refetch }),
    { wrapper });
    expect(withResult.current.hasBeenSavedOnce).toBe(true);

    const empty = buildSheet([{}]);
    const { result: emptyResult } = renderHook(() =>
      useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: 'sheet-1', treatmentSheet: empty, refetch }),
    { wrapper });
    expect(emptyResult.current.hasBeenSavedOnce).toBe(false);
  });

  it('CHARACTERIZATION: updateSingleRow saves the row via the row-scoped update call, exits edit mode, and refetches on success', async () => {
    const treatmentSheet = buildSheet([{ treatment_description: 'Abhyanga' }]);
    const { result } = renderHook(() =>
      useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: 'sheet-1', treatmentSheet, refetch }),
    { wrapper });

    act(() => {
      result.current.updateRowField(0, 'treatment_name', 'Shirodhara');
    });

    await act(async () => {
      await result.current.updateSingleRow(0);
    });

    // T-FE-E.2 (FR-TS-3): updateTreatmentSheetRowApi no longer takes
    // tenantId -- its URL never carried tenant scoping (a genuine
    // route-mismatch defect this task closed); this hook still doesn't
    // pass expectedVersion (unchanged caller, third arg stays undefined).
    expect(updateTreatmentSheetRowApi).toHaveBeenCalledWith('row-1', {
      treatment_description: 'Shirodhara',
      medicines_given: '',
      instructions: '',
    }, undefined);
    expect(result.current.rowsData[0].isSaving).toBe(false);
    expect(result.current.rowsData[0].isEditing).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('CHARACTERIZATION: updateSingleRow surfaces a failure via Alert, clears isSaving, and does NOT refetch', async () => {
    (updateTreatmentSheetRowApi as jest.Mock).mockRejectedValue(new Error('network down'));
    const treatmentSheet = buildSheet([{ treatment_description: 'Abhyanga' }]);
    const { result } = renderHook(() =>
      useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: 'sheet-1', treatmentSheet, refetch }),
    { wrapper });

    await act(async () => {
      await result.current.updateSingleRow(0);
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update row.');
    expect(result.current.rowsData[0].isSaving).toBe(false);
    expect(refetch).not.toHaveBeenCalled();
  });

  it('CHARACTERIZATION: saveAllRows bulk-saves every row via the tenant/sheet-scoped bulk call, marks hasBeenSavedOnce, exits edit mode on every row, and refetches on success', async () => {
    const treatmentSheet = buildSheet([{ treatment_description: 'Abhyanga' }, { treatment_description: '' }]);
    const { result } = renderHook(() =>
      useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: 'sheet-1', treatmentSheet, refetch }),
    { wrapper });

    await act(async () => {
      await result.current.saveAllRows();
    });

    expect(updateAllTreatmentSheetRowsApi).toHaveBeenCalledWith('tenant-1', 'sheet-1', [
      { id: 'row-1', treatment_description: 'Abhyanga', medicines_given: '', instructions: '' },
      { id: 'row-2', treatment_description: '', medicines_given: '', instructions: '' },
    ]);
    expect(result.current.hasBeenSavedOnce).toBe(true);
    expect(result.current.rowsData.every((r) => !r.isEditing)).toBe(true);
    expect(result.current.isSavingAll).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('CHARACTERIZATION: saveAllRows surfaces a failure via Alert, clears isSavingAll, and does NOT refetch', async () => {
    (updateAllTreatmentSheetRowsApi as jest.Mock).mockRejectedValue(new Error('version conflict'));
    const treatmentSheet = buildSheet([{ treatment_description: 'Abhyanga' }]);
    const { result } = renderHook(() =>
      useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: 'sheet-1', treatmentSheet, refetch }),
    { wrapper });

    await act(async () => {
      await result.current.saveAllRows();
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to save all rows.');
    expect(result.current.isSavingAll).toBe(false);
    expect(refetch).not.toHaveBeenCalled();
  });

  it('CHARACTERIZATION: copyFromAbove copies only treatment_name/medicines_text/instructions_text from the previous row, leaving session_date/session_id/day_number of the target row untouched (no identity conflation)', () => {
    const treatmentSheet = buildSheet([
      { treatment_description: 'Abhyanga', medicines_given: 'Oil', instructions: 'Rest', session_date: '2026-07-05' },
      { session_date: '2026-07-06' },
    ]);
    const { result } = renderHook(() =>
      useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: 'sheet-1', treatmentSheet, refetch }),
    { wrapper });

    act(() => {
      result.current.copyFromAbove(1);
    });

    expect(result.current.rowsData[1]).toEqual(
      expect.objectContaining({
        treatment_name: 'Abhyanga',
        medicines_text: 'Oil',
        instructions_text: 'Rest',
        day_number: 2,
        session_date: '2026-07-06',
      }),
    );
  });

  it("CHARACTERIZATION: copyFromAbove on the first row is a no-op (Alert only), never calls copy logic", () => {
    const treatmentSheet = buildSheet([{ treatment_description: 'Abhyanga' }]);
    const { result } = renderHook(() =>
      useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: 'sheet-1', treatmentSheet, refetch }),
    { wrapper });

    act(() => {
      result.current.copyFromAbove(0);
    });

    expect(Alert.alert).toHaveBeenCalledWith('Info', 'This is the first row. Nothing to copy from.');
  });

  it('CHARACTERIZATION: toggleEditMode flips isEditing for only the targeted row', () => {
    const treatmentSheet = buildSheet([{ treatment_description: 'Abhyanga' }, { treatment_description: 'Shirodhara' }]);
    const { result } = renderHook(() =>
      useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: 'sheet-1', treatmentSheet, refetch }),
    { wrapper });
    const initial = result.current.rowsData[0].isEditing;

    act(() => {
      result.current.toggleEditMode(0);
    });

    expect(result.current.rowsData[0].isEditing).toBe(!initial);
    expect(result.current.rowsData[1].isEditing).toBe(result.current.rowsData[1].isEditing);
  });

  it('CHARACTERIZATION: rows rebuild when treatmentSheet identity changes (no cross-sheet row leakage between two different treatment sheets)', async () => {
    const sheetA = buildSheet([{ treatment_description: 'Abhyanga' }]);
    const { result, rerender } = renderHook(
      (props: { treatmentSheet: TreatmentSheetResponse }) =>
        useTreatmentSheetRows({ tenantId: 'tenant-1', treatmentSheetId: props.treatmentSheet.id, treatmentSheet: props.treatmentSheet, refetch }),
      { initialProps: { treatmentSheet: sheetA }, wrapper },
    );
    expect(result.current.rowsData.map((r) => r.id)).toEqual(['row-1']);

    const sheetB: TreatmentSheetResponse = { ...buildSheet([{ treatment_description: 'Shirodhara' }, {}]), id: 'sheet-2' };
    rerender({ treatmentSheet: sheetB });

    await waitFor(() => expect(result.current.rowsData.map((r) => r.id)).toEqual(['row-1', 'row-2']));
  });
});
