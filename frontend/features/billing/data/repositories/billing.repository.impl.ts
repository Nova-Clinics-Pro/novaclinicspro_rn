/**
 * Billing Repository Implementation
 * React Query hooks for billing operations
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  listInvoicesApi,
  getInvoiceApi,
  createInvoiceApi,
  createVisitScopedInvoiceApi,
  updateInvoiceApi,
  listPaymentsForInvoiceApi,
  getPaymentApi,
  createPaymentApi,
} from '../datasources/billing.api';
import {
  InvoiceCreateRequest,
  VisitScopedInvoiceCreateRequest,
  InvoiceUpdateRequest,
  PaymentCreateRequest,
  InvoiceResponse,
  InvoiceListResponse,
  PaymentResponse,
  PaymentListResponse,
  ListInvoicesParams,
  ListPaymentsParams,
  SubscriptionSummary,
  parseAmount,
  isInvoicePaid,
} from '../models/billing.dtos';

// ============================================
// QUERY KEYS
// ============================================

export const billingKeys = {
  all: ['billing'] as const,
  // Invoices
  invoices: () => [...billingKeys.all, 'invoices'] as const,
  invoicesList: (tenantId: string, params?: ListInvoicesParams) =>
    [...billingKeys.invoices(), 'list', tenantId, params] as const,
  invoiceDetail: (tenantId: string, invoiceId: string) =>
    [...billingKeys.invoices(), 'detail', tenantId, invoiceId] as const,
  // Payments
  payments: () => [...billingKeys.all, 'payments'] as const,
  paymentsList: (tenantId: string, invoiceId: string, params?: ListPaymentsParams) =>
    [...billingKeys.payments(), 'list', tenantId, invoiceId, params] as const,
  paymentDetail: (tenantId: string, paymentId: string) =>
    [...billingKeys.payments(), 'detail', tenantId, paymentId] as const,
  // Summary
  summary: (tenantId: string) =>
    [...billingKeys.all, 'summary', tenantId] as const,
};

// ============================================
// INVOICE HOOKS
// ============================================

/**
 * Hook to list invoices
 */
export const useInvoicesListQuery = (
  tenantId: string,
  params?: ListInvoicesParams,
  options?: Omit<UseQueryOptions<InvoiceListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<InvoiceListResponse, Error>({
    queryKey: billingKeys.invoicesList(tenantId, params),
    queryFn: () => listInvoicesApi(tenantId, params),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to get invoice detail
 */
export const useInvoiceDetailQuery = (
  tenantId: string,
  invoiceId: string,
  options?: Omit<UseQueryOptions<InvoiceResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<InvoiceResponse, Error>({
    queryKey: billingKeys.invoiceDetail(tenantId, invoiceId),
    queryFn: () => getInvoiceApi(tenantId, invoiceId),
    enabled: !!tenantId && !!invoiceId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to create invoice
 */
export const useCreateInvoiceMutation = (
  tenantId: string,
  options?: UseMutationOptions<InvoiceResponse, Error, InvoiceCreateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<InvoiceResponse, Error, InvoiceCreateRequest>({
    mutationFn: (payload) => createInvoiceApi(tenantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.summary(tenantId) });
    },
    ...options,
  });
};

export const useCreateVisitScopedInvoiceMutation = (
  tenantId: string,
  options?: UseMutationOptions<InvoiceResponse, Error, VisitScopedInvoiceCreateRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<InvoiceResponse, Error, VisitScopedInvoiceCreateRequest>({
    mutationFn: (payload) => createVisitScopedInvoiceApi(tenantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.summary(tenantId) });
    },
    ...options,
  });
};

/**
 * Hook to update invoice
 */
export const useUpdateInvoiceMutation = (
  tenantId: string,
  invoiceId: string,
  options?: UseMutationOptions<InvoiceResponse, Error, InvoiceUpdateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<InvoiceResponse, Error, InvoiceUpdateRequest>({
    mutationFn: (payload) => updateInvoiceApi(tenantId, invoiceId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(billingKeys.invoiceDetail(tenantId, invoiceId), data);
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.summary(tenantId) });
    },
    ...options,
  });
};

// ============================================
// PAYMENT HOOKS
// ============================================

/**
 * Hook to list payments for an invoice
 */
export const usePaymentsForInvoiceQuery = (
  tenantId: string,
  invoiceId: string,
  params?: ListPaymentsParams,
  options?: Omit<UseQueryOptions<PaymentListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaymentListResponse, Error>({
    queryKey: billingKeys.paymentsList(tenantId, invoiceId, params),
    queryFn: () => listPaymentsForInvoiceApi(tenantId, invoiceId, params),
    enabled: !!tenantId && !!invoiceId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to get payment detail
 */
export const usePaymentDetailQuery = (
  tenantId: string,
  paymentId: string,
  options?: Omit<UseQueryOptions<PaymentResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaymentResponse, Error>({
    queryKey: billingKeys.paymentDetail(tenantId, paymentId),
    queryFn: () => getPaymentApi(tenantId, paymentId),
    enabled: !!tenantId && !!paymentId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to create/record payment
 */
export const useCreatePaymentMutation = (
  tenantId: string,
  options?: UseMutationOptions<PaymentResponse, Error, PaymentCreateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<PaymentResponse, Error, PaymentCreateRequest>({
    mutationFn: (payload) => createPaymentApi(tenantId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.payments() });
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.summary(tenantId) });
    },
    ...options,
  });
};

// ============================================
// SUBSCRIPTION SUMMARY HOOK
// ============================================

/**
 * Hook to get subscription summary derived from invoices
 * This aggregates data from the invoices list to create a summary
 */
export const useSubscriptionSummaryQuery = (
  tenantId: string,
  options?: Omit<UseQueryOptions<SubscriptionSummary, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<SubscriptionSummary, Error>({
    queryKey: billingKeys.summary(tenantId),
    queryFn: async () => {
      // Fetch all invoices to derive summary
      const invoicesResponse = await listInvoicesApi(tenantId, { limit: 100 });
      const invoices = invoicesResponse.items || [];

      // Calculate stats
      let outstandingBalance = 0;
      let paidInvoices = 0;
      let unpaidInvoices = 0;
      let nextDueDate: string | null = null;
      let nextDueAmount: number | null = null;

      const unpaidInvoicesList: InvoiceResponse[] = [];

      invoices.forEach((invoice) => {
        const totalAmount = parseAmount(invoice.total_amount);
        const isPaid = isInvoicePaid(invoice);

        if (isPaid) {
          paidInvoices++;
        } else {
          unpaidInvoices++;
          outstandingBalance += totalAmount;
          unpaidInvoicesList.push(invoice);
        }
      });

      // Find earliest unpaid invoice for next due
      if (unpaidInvoicesList.length > 0) {
        const sortedUnpaid = unpaidInvoicesList
          .filter((inv) => inv.due_date)
          .sort((a, b) => {
            const dateA = new Date(a.due_date!).getTime();
            const dateB = new Date(b.due_date!).getTime();
            return dateA - dateB;
          });

        if (sortedUnpaid.length > 0) {
          nextDueDate = sortedUnpaid[0].due_date;
          nextDueAmount = parseAmount(sortedUnpaid[0].total_amount);
        }
      }

      // For last payment, we'd need to query payments - for now return null
      // as we don't have a "list all payments" endpoint
      return {
        outstandingBalance,
        lastPaymentDate: null,
        lastPaymentAmount: null,
        nextDueDate,
        nextDueAmount,
        totalInvoices: invoices.length,
        paidInvoices,
        unpaidInvoices,
      };
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
};
