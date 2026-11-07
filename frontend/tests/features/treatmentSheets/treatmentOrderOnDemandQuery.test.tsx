import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { getTreatmentOrderApi } from '../../../features/treatmentSheets/data/datasources/treatmentOrders.api';
import {
  treatmentOrderKeys,
  useTreatmentOrderOnDemand,
} from '../../../features/treatmentSheets/data/repositories/treatmentOrders.repository.impl';

jest.mock('../../../features/treatmentSheets/data/datasources/treatmentOrders.api', () => ({
  getTreatmentOrderApi: jest.fn(),
}));

const mockedGetTreatmentOrderApi = getTreatmentOrderApi as jest.Mock;

describe('useTreatmentOrderOnDemand', () => {
  it('uses the canonical detail cache key and tenant-scoped Treatment Order datasource', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const order = { id: 'sheet-1', version: 7 };
    mockedGetTreatmentOrderApi.mockResolvedValue(order);

    const { result } = renderHook(() => useTreatmentOrderOnDemand(), { wrapper });

    await act(async () => {
      await expect(result.current('sheet-1', 'tenant-1')).resolves.toBe(order);
    });

    expect(mockedGetTreatmentOrderApi).toHaveBeenCalledWith('sheet-1', 'tenant-1');
    expect(queryClient.getQueryData(treatmentOrderKeys.detail('sheet-1'))).toBe(order);
  });
});
