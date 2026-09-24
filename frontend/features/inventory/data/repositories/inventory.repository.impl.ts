/**
 * Inventory Repository Implementation
 * React Query hooks for inventory management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  listInventoryItemsApi,
  getInventoryItemApi,
  createInventoryItemApi,
  updateInventoryItemApi,
  deleteInventoryItemApi,
  adjustInventoryStockApi,
  listInventoryMovementsApi,
  listInventoryBatchesApi,
  createInventoryBatchApi,
  updateInventoryBatchApi,
  listInventoryAlertsApi,
  acknowledgeInventoryAlertsApi,
  searchInventoryApi,
} from '../datasources/inventory.api';
import {
  InventoryCreateRequest,
  InventoryUpdateRequest,
  StockAdjustmentRequest,
  BatchCreateRequest,
  BatchUpdateRequest,
  AlertAcknowledgeRequest,
  InventoryItemResponse,
  InventoryListResponse,
  MovementResponse,
  MovementsListResponse,
  BatchResponse,
  BatchesListResponse,
  AlertsListResponse,
  ListInventoryParams,
  ListMovementsParams,
  ListBatchesParams,
  ListAlertsParams,
} from '../models/inventory.dtos';
import { invalidateCanonicalOnboardingState } from '../../../onboarding/data/repositories/onboardingFreshness';

// ============================================
// QUERY KEYS
// ============================================

export const inventoryKeys = {
  all: ['inventory'] as const,
  // Items
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (tenantId: string, params?: ListInventoryParams) =>
    [...inventoryKeys.lists(), tenantId, params] as const,
  details: () => [...inventoryKeys.all, 'detail'] as const,
  detail: (tenantId: string, itemId: string) =>
    [...inventoryKeys.details(), tenantId, itemId] as const,
  search: (tenantId: string, query: string) =>
    [...inventoryKeys.all, 'search', tenantId, query] as const,
  // Movements
  movements: () => [...inventoryKeys.all, 'movements'] as const,
  movementsList: (tenantId: string, itemId: string, params?: ListMovementsParams) =>
    [...inventoryKeys.movements(), tenantId, itemId, params] as const,
  // Batches
  batches: () => [...inventoryKeys.all, 'batches'] as const,
  batchesList: (tenantId: string, itemId: string, params?: ListBatchesParams) =>
    [...inventoryKeys.batches(), tenantId, itemId, params] as const,
  // Alerts
  alerts: () => [...inventoryKeys.all, 'alerts'] as const,
  alertsList: (tenantId: string, params?: ListAlertsParams) =>
    [...inventoryKeys.alerts(), tenantId, params] as const,
};

const removeInventoryItemFromCachedLists = (
  queryClient: ReturnType<typeof useQueryClient>,
  itemId: string
) => {
  queryClient.setQueriesData<InventoryListResponse>(
    { queryKey: inventoryKeys.lists(), exact: false },
    (current) => {
      if (!current) return current;
      const nextItems = current.items.filter((item) => item.id !== itemId);
      if (nextItems.length === current.items.length) return current;
      return {
        ...current,
        items: nextItems,
        total: Math.max(0, current.total - (current.items.length - nextItems.length)),
      };
    }
  );
};

// ============================================
// INVENTORY ITEMS HOOKS
// ============================================

/**
 * Hook to list inventory items
 */
export const useInventoryItemsListQuery = (
  tenantId: string,
  params?: ListInventoryParams,
  options?: Omit<UseQueryOptions<InventoryListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<InventoryListResponse, Error>({
    queryKey: inventoryKeys.list(tenantId, params),
    queryFn: () => listInventoryItemsApi(tenantId, params),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

/**
 * Hook to get a single inventory item
 */
export const useInventoryItemDetailQuery = (
  tenantId: string,
  itemId: string,
  options?: Omit<UseQueryOptions<InventoryItemResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<InventoryItemResponse, Error>({
    queryKey: inventoryKeys.detail(tenantId, itemId),
    queryFn: () => getInventoryItemApi(tenantId, itemId),
    enabled: !!tenantId && !!itemId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to create a new inventory item
 */
export const useCreateInventoryItemMutation = (
  tenantId: string,
  options?: UseMutationOptions<InventoryItemResponse, Error, InventoryCreateRequest>
) => {
  const queryClient = useQueryClient();
  const { onSuccess: handleSuccess, ...mutationOptions } = options ?? {};

  return useMutation<InventoryItemResponse, Error, InventoryCreateRequest>({
    mutationFn: (payload) => createInventoryItemApi(tenantId, payload),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
      await handleSuccess?.(data, variables, context);
    },
    ...mutationOptions,
  });
};

/**
 * Hook to update an inventory item
 */
export const useUpdateInventoryItemMutation = (
  tenantId: string,
  itemId: string,
  options?: UseMutationOptions<InventoryItemResponse, Error, InventoryUpdateRequest>
) => {
  const queryClient = useQueryClient();
  const { onSuccess: handleSuccess, ...mutationOptions } = options ?? {};

  return useMutation<InventoryItemResponse, Error, InventoryUpdateRequest>({
    mutationFn: (payload) => updateInventoryItemApi(tenantId, itemId, payload),
    onSuccess: async (data, variables, context) => {
      queryClient.setQueryData(inventoryKeys.detail(tenantId, itemId), data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
      await handleSuccess?.(data, variables, context);
    },
    ...mutationOptions,
  });
};

/**
 * Hook to delete an inventory item
 */
export const useDeleteInventoryItemMutation = (
  tenantId: string,
  itemId: string,
  options?: UseMutationOptions<void, Error, void>
) => {
  const queryClient = useQueryClient();
  const { onSuccess: handleSuccess, ...mutationOptions } = options ?? {};

  return useMutation<void, Error, void>({
    mutationFn: () => deleteInventoryItemApi(tenantId, itemId),
    onSuccess: async (data, variables, context) => {
      removeInventoryItemFromCachedLists(queryClient, itemId);
      queryClient.removeQueries({ queryKey: inventoryKeys.detail(tenantId, itemId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(tenantId, itemId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
      await handleSuccess?.(data, variables, context);
    },
    ...mutationOptions,
  });
};

// ============================================
// STOCK ADJUSTMENT & MOVEMENTS HOOKS
// ============================================

/**
 * Hook to adjust stock for an inventory item
 */
export const useAdjustInventoryStockMutation = (
  tenantId: string,
  itemId: string,
  options?: UseMutationOptions<MovementResponse, Error, StockAdjustmentRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<MovementResponse, Error, StockAdjustmentRequest>({
    mutationFn: (payload) => adjustInventoryStockApi(tenantId, itemId, payload),
    onSuccess: () => {
      // Invalidate item detail (stock changed)
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(tenantId, itemId) });
      // Invalidate list (stock changed)
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      // Invalidate movements list
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
      // Invalidate alerts (low stock might be resolved)
      queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts() });
    },
    ...options,
  });
};

/**
 * Hook to list movements for an inventory item
 */
export const useInventoryMovementsListQuery = (
  tenantId: string,
  itemId: string,
  params?: ListMovementsParams,
  options?: Omit<UseQueryOptions<MovementsListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<MovementsListResponse, Error>({
    queryKey: inventoryKeys.movementsList(tenantId, itemId, params),
    queryFn: () => listInventoryMovementsApi(tenantId, itemId, params),
    enabled: !!tenantId && !!itemId,
    staleTime: 30 * 1000,
    ...options,
  });
};

// ============================================
// BATCHES HOOKS
// ============================================

/**
 * Hook to list batches for an inventory item
 */
export const useInventoryBatchesListQuery = (
  tenantId: string,
  itemId: string,
  params?: ListBatchesParams,
  options?: Omit<UseQueryOptions<BatchesListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<BatchesListResponse, Error>({
    queryKey: inventoryKeys.batchesList(tenantId, itemId, params),
    queryFn: () => listInventoryBatchesApi(tenantId, itemId, params),
    enabled: !!tenantId && !!itemId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to create a batch for an inventory item
 */
export const useCreateInventoryBatchMutation = (
  tenantId: string,
  itemId: string,
  options?: UseMutationOptions<BatchResponse, Error, BatchCreateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<BatchResponse, Error, BatchCreateRequest>({
    mutationFn: (payload) => createInventoryBatchApi(tenantId, itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.batchesList(tenantId, itemId) });
      // Batches may affect item stock
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(tenantId, itemId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
    },
    ...options,
  });
};

/**
 * Hook to update a batch
 */
export const useUpdateInventoryBatchMutation = (
  tenantId: string,
  batchId: string,
  itemId: string, // For cache invalidation
  options?: UseMutationOptions<BatchResponse, Error, BatchUpdateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<BatchResponse, Error, BatchUpdateRequest>({
    mutationFn: (payload) => updateInventoryBatchApi(tenantId, batchId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.batches() });
      // Batch changes may affect alerts
      queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts() });
    },
    ...options,
  });
};

// ============================================
// ALERTS HOOKS
// ============================================

/**
 * Hook to list inventory alerts
 */
export const useInventoryAlertsListQuery = (
  tenantId: string,
  params?: ListAlertsParams,
  options?: Omit<UseQueryOptions<AlertsListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AlertsListResponse, Error>({
    queryKey: inventoryKeys.alertsList(tenantId, params),
    queryFn: () => listInventoryAlertsApi(tenantId, params),
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
};

/**
 * Hook to acknowledge inventory alerts
 */
export const useAcknowledgeInventoryAlertsMutation = (
  tenantId: string,
  options?: UseMutationOptions<void, Error, AlertAcknowledgeRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, AlertAcknowledgeRequest>({
    mutationFn: (payload) => acknowledgeInventoryAlertsApi(tenantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.alerts() });
    },
    ...options,
  });
};

// ============================================
// SEARCH HOOKS
// ============================================

/**
 * Hook to search inventory by medicine name, batch number, sku, or expiry date
 * Uses the dedicated search endpoint: GET /api/v1/clinic/{tenant_id}/inventory/search
 * 
 * @param tenantId - Clinic tenant ID
 * @param query - Search query (min 3 characters to trigger API call)
 * @param limit - Optional limit for results
 */
export const useSearchInventoryQuery = (
  tenantId: string,
  query: string,
  limit?: number,
  options?: Omit<UseQueryOptions<InventoryListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<InventoryListResponse, Error>({
    queryKey: inventoryKeys.search(tenantId, query),
    queryFn: () => searchInventoryApi(tenantId, query, limit),
    // Only enable when tenantId exists and query has at least 3 characters
    enabled: !!tenantId && query.length >= 3,
    // Keep stale data while fetching new results
    staleTime: 30000, // 30 seconds
    ...options,
  });
};
