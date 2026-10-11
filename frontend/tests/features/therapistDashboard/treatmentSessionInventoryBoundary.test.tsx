import { act, renderHook } from '@testing-library/react-native';
import { useInventoryItemsListQuery } from '../../../features/inventory/data/repositories/inventory.repository.impl';
import { useInventorySearch } from '../../../features/therapistDashboard/presentation/components/TreatmentSessionCompleteModal';

jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../features/inventory/data/repositories/inventory.repository.impl', () => ({
  useInventoryItemsListQuery: jest.fn(),
}));

const mockedInventoryQuery = useInventoryItemsListQuery as jest.Mock;

describe('TreatmentSessionCompleteModal Inventory boundary', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedInventoryQuery.mockReturnValue({
      data: { items: [{ id: 'inventory-1', name: 'Sesame Oil', unit: 'ml' }] },
      isFetching: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('debounces the canonical active Inventory list query with the existing autocomplete parameters', () => {
    const { result, rerender } = renderHook(
      ({ query }) => useInventorySearch('tenant-1', query),
      { initialProps: { query: '' } }
    );

    expect(result.current.results).toEqual([]);
    expect(mockedInventoryQuery).toHaveBeenLastCalledWith(
      'tenant-1',
      { search: '', limit: 8, is_active: true },
      expect.objectContaining({ enabled: false, retry: false, staleTime: 0 })
    );

    rerender({ query: 'Se' });
    act(() => jest.advanceTimersByTime(299));
    expect(mockedInventoryQuery).toHaveBeenLastCalledWith(
      'tenant-1',
      { search: '', limit: 8, is_active: true },
      expect.objectContaining({ enabled: false })
    );

    act(() => jest.advanceTimersByTime(1));
    expect(mockedInventoryQuery).toHaveBeenLastCalledWith(
      'tenant-1',
      { search: 'Se', limit: 8, is_active: true },
      expect.objectContaining({ enabled: true, retry: false, staleTime: 0 })
    );
  });

  it('keeps failed or empty canonical queries as an empty suggestion set', () => {
    mockedInventoryQuery.mockReturnValue({ data: undefined, isFetching: false });

    const { result } = renderHook(() => useInventorySearch('tenant-1', 'Oil'));
    act(() => jest.advanceTimersByTime(300));

    expect(result.current.results).toEqual([]);
  });
});
