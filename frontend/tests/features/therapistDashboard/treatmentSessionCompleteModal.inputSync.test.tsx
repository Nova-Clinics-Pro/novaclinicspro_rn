/**
 * TreatmentSessionCompleteModal — inventory-search short-query reset and material-name synchronization.
 *
 * Covers two render-phase state adjustments that replaced effects (lint remediation,
 * react-hooks/set-state-in-effect):
 *   - useInventorySearch: a query shorter than 2 characters clears the debounced value immediately
 *     (stale suggestions must never show for the previous, longer query); the debounce timer stays an effect.
 *   - MaterialNameField: the input text follows the form value and never loses the user's typing.
 */
import React from 'react';
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import { useInventoryItemsListQuery } from '../../../features/inventory/data/repositories/inventory.repository.impl';
import {
  TreatmentSessionCompleteModal,
  useInventorySearch,
} from '../../../features/therapistDashboard/presentation/components/TreatmentSessionCompleteModal';

jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { tenantId: 'tenant-1' } }),
}));
jest.mock('../../../features/inventory/data/repositories/inventory.repository.impl', () => ({
  useInventoryItemsListQuery: jest.fn(),
}));

const mockedQuery = useInventoryItemsListQuery as jest.Mock;
const ITEMS = [
  { id: 'inv-1', name: 'Sesame Oil', unit: 'ml' },
  { id: 'inv-2', name: 'Sesame Paste', unit: 'g' },
];

beforeEach(() => {
  jest.useFakeTimers();
  mockedQuery.mockReset();
  mockedQuery.mockReturnValue({ data: { items: ITEMS }, isFetching: false });
});
afterEach(() => {
  jest.useRealTimers();
});

const lastParams = () => mockedQuery.mock.calls[mockedQuery.mock.calls.length - 1][1];
const lastOptions = () => mockedQuery.mock.calls[mockedQuery.mock.calls.length - 1][2];
const ticks = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

describe('useInventorySearch — short-query reset', () => {
  it('shows suggestions for a long enough query once the debounce elapses', () => {
    const { result } = renderHook(() => useInventorySearch('tenant-1', 'Ses'));
    expect(result.current.results).toEqual([]);
    ticks(300);
    expect(result.current.results).toEqual(ITEMS);
    expect(lastParams()).toEqual({ search: 'Ses', limit: 8, is_active: true });
    expect(lastOptions().enabled).toBe(true);
  });

  it('changing a three-character query to one character clears the stale results immediately', () => {
    const { result, rerender } = renderHook(({ q }) => useInventorySearch('tenant-1', q), {
      initialProps: { q: 'Ses' },
    });
    ticks(300);
    expect(result.current.results).toEqual(ITEMS);

    rerender({ q: 'S' });
    // No timer needs to elapse: results for 'Ses' must not be shown for 'S'.
    expect(result.current.results).toEqual([]);
    expect(lastParams().search).toBe('');
    expect(lastOptions().enabled).toBe(false);
    expect(result.current.isSearching).toBe(false);
  });

  it('stays cleared after the debounce window passes (no stale timer resurrects the old query)', () => {
    const { result, rerender } = renderHook(({ q }) => useInventorySearch('tenant-1', q), {
      initialProps: { q: 'Ses' },
    });
    ticks(100); // typed 'Ses', then deleted down to 'S' before the debounce fired
    rerender({ q: 'S' });
    ticks(1000);
    expect(result.current.results).toEqual([]);
    expect(lastParams().search).toBe('');
    expect(lastOptions().enabled).toBe(false);
  });

  it('clears when the query is emptied completely', () => {
    const { result, rerender } = renderHook(({ q }) => useInventorySearch('tenant-1', q), {
      initialProps: { q: 'Sesame' },
    });
    ticks(300);
    expect(result.current.results).toEqual(ITEMS);
    rerender({ q: '' });
    expect(result.current.results).toEqual([]);
    expect(lastParams().search).toBe('');
  });

  it('searches again after growing back from one character to two', () => {
    const { result, rerender } = renderHook(({ q }) => useInventorySearch('tenant-1', q), {
      initialProps: { q: 'Ses' },
    });
    ticks(300);
    rerender({ q: 'S' });
    expect(result.current.results).toEqual([]);
    rerender({ q: 'Se' });
    expect(result.current.results).toEqual([]); // debouncing again, not instant
    ticks(300);
    expect(lastParams().search).toBe('Se');
    expect(result.current.results).toEqual(ITEMS);
  });

  it('a new longer query keeps debouncing from the latest keystroke only', () => {
    const { result, rerender } = renderHook(({ q }) => useInventorySearch('tenant-1', q), {
      initialProps: { q: 'Se' },
    });
    ticks(200);
    rerender({ q: 'Ses' });
    ticks(200); // 400ms after 'Se' but only 200ms after 'Ses'
    expect(lastParams().search).toBe('');
    ticks(100);
    expect(lastParams().search).toBe('Ses');
    expect(result.current.results).toEqual(ITEMS);
  });
});

describe('TreatmentSessionCompleteModal — material name field', () => {
  const MATERIALS = [
    {
      inventory_item_id: 'inv-1',
      material_name: 'Sesame Oil',
      material_code: null,
      quantity_used: 5,
      unit: 'ml',
      ml_per_unit: 1,
      category: 'oil' as const,
    },
  ];

  const renderModal = (props: Partial<React.ComponentProps<typeof TreatmentSessionCompleteModal>> = {}) => {
    const base = {
      visible: true,
      rowId: 'row-1',
      initialMaterials: MATERIALS,
      onSubmit: jest.fn().mockResolvedValue(undefined),
      onClose: jest.fn(),
      isSubmitting: false,
      submitStatus: 'idle' as const,
      errorMessage: null,
    };
    const utils = render(<TreatmentSessionCompleteModal {...base} {...props} />);
    const update = (next: Partial<React.ComponentProps<typeof TreatmentSessionCompleteModal>>) =>
      utils.rerender(<TreatmentSessionCompleteModal {...base} {...props} {...next} />);
    return { ...utils, update };
  };
  const nameInput = (u: ReturnType<typeof renderModal>) => u.getByLabelText('Material 1 name');
  // The form validates asynchronously after every change; flush it so no update lands outside act().
  const type = async (u: ReturnType<typeof renderModal>, text: string) => {
    await act(async () => { fireEvent.changeText(nameInput(u), text); });
  };

  it('shows the pre-configured material name', async () => {
    const u = renderModal();
    expect(nameInput(u).props.value).toBe('Sesame Oil');
  });

  it('keeps what the user typed across unrelated re-renders (e.g. submitting flag changes)', async () => {
    const u = renderModal();
    await type(u, 'Sesame Oil Plus');
    expect(nameInput(u).props.value).toBe('Sesame Oil Plus');
    await act(async () => { u.update({ isSubmitting: true }); });
    await act(async () => { u.update({ isSubmitting: false }); });
    expect(nameInput(u).props.value).toBe('Sesame Oil Plus');
  });

  it('shows the typed text rather than a stale form value while the user is typing character by character', async () => {
    const u = renderModal();
    for (const text of ['Ses', 'Sesa', 'Sesam']) {
      await type(u, text);
      expect(nameInput(u).props.value).toBe(text);
    }
  });

  it('restores the form value when the form is reset from new initial materials', async () => {
    const u = renderModal();
    await type(u, 'Something else');
    await act(async () => { u.update({ initialMaterials: [{ ...MATERIALS[0], material_name: 'Castor Oil', inventory_item_id: 'inv-9' }] }); });
    expect(nameInput(u).props.value).toBe('Castor Oil');
  });

  it('puts the chosen inventory item name in the field and hides the suggestions', async () => {
    const u = renderModal({ initialMaterials: [{ ...MATERIALS[0], material_name: '', inventory_item_id: null }] });
    await act(async () => { fireEvent(nameInput(u), 'focus'); });
    await type(u, 'Ses');
    ticks(300);
    expect(u.getByLabelText('Select Sesame Oil')).toBeTruthy();
    await act(async () => { fireEvent(u.getByLabelText('Select Sesame Oil'), 'pressIn'); });
    expect(nameInput(u).props.value).toBe('Sesame Oil');
    expect(u.queryByLabelText('Select Sesame Oil')).toBeNull();
    expect(u.getByLabelText('Material 1 unit').props.value).toBe('ml');
  });

  it('hides suggestions when the typed text drops below two characters', async () => {
    const u = renderModal({ initialMaterials: [{ ...MATERIALS[0], material_name: '', inventory_item_id: null }] });
    await type(u, 'Ses');
    ticks(300);
    expect(u.getByLabelText('Select Sesame Oil')).toBeTruthy();
    await type(u, 'S');
    expect(u.queryByLabelText('Select Sesame Oil')).toBeNull();
    expect(u.queryByLabelText('Select Sesame Paste')).toBeNull();
  });
});
