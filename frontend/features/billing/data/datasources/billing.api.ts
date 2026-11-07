/**
 * Billing API
 * Handles all HTTP calls for billing operations
 *
 * IMPORTANT: All paths use /api/v1/finance/{tenant_id}/...
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import {
  InvoiceCreateRequest,
  InvoiceUpdateRequest,
  PaymentCreateRequest,
  InvoiceResponse,
  InvoiceListResponse,
  PaymentResponse,
  PaymentListResponse,
  ListInvoicesParams,
  ListPaymentsParams,
  VisitScopedInvoiceCreateRequest,
} from '../models/billing.dtos';

// ============================================
// INVOICES
// ============================================

/**
 * List invoices for a tenant
 * GET /api/v1/finance/{tenant_id}/invoices
 */
export const listInvoicesApi = async (
  tenantId: string,
  params?: ListInvoicesParams
): Promise<InvoiceListResponse> => {
  const response = await axiosClient.get(
    `/api/v1/finance/${tenantId}/invoices`,
    { params }
  );
  return response.data;
};

/**
 * Get a single invoice
 * GET /api/v1/finance/{tenant_id}/invoices/{invoice_id}
 */
export const getInvoiceApi = async (
  tenantId: string,
  invoiceId: string
): Promise<InvoiceResponse> => {
  const response = await axiosClient.get(
    `/api/v1/finance/${tenantId}/invoices/${invoiceId}`
  );
  return response.data;
};

/**
 * Create a new invoice
 * POST /api/v1/finance/{tenant_id}/invoices
 */
export const createInvoiceApi = async (
  tenantId: string,
  payload: InvoiceCreateRequest
): Promise<InvoiceResponse> => {
  const response = await axiosClient.post(
    `/api/v1/finance/${tenantId}/invoices`,
    payload
  );
  return response.data;
};

export const createVisitScopedInvoiceApi = async (tenantId: string, payload: VisitScopedInvoiceCreateRequest): Promise<InvoiceResponse> => {
  const response = await axiosClient.post(`/api/v1/finance/${tenantId}/invoices/visit-scoped`, payload);
  return response.data;
};

/**
 * Update an invoice
 * PATCH /api/v1/finance/{tenant_id}/invoices/{invoice_id}
 */
export const updateInvoiceApi = async (
  tenantId: string,
  invoiceId: string,
  payload: InvoiceUpdateRequest
): Promise<InvoiceResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/finance/${tenantId}/invoices/${invoiceId}`,
    payload
  );
  return response.data;
};

// ============================================
// PAYMENTS
// ============================================

/**
 * List payments for an invoice
 * GET /api/v1/finance/{tenant_id}/invoices/{invoice_id}/payments
 */
export const listPaymentsForInvoiceApi = async (
  tenantId: string,
  invoiceId: string,
  params?: ListPaymentsParams
): Promise<PaymentListResponse> => {
  const response = await axiosClient.get(
    `/api/v1/finance/${tenantId}/invoices/${invoiceId}/payments`,
    { params }
  );
  return response.data;
};

/**
 * Get a single payment
 * GET /api/v1/finance/{tenant_id}/payments/{payment_id}
 */
export const getPaymentApi = async (
  tenantId: string,
  paymentId: string
): Promise<PaymentResponse> => {
  const response = await axiosClient.get(
    `/api/v1/finance/${tenantId}/payments/${paymentId}`
  );
  return response.data;
};

/**
 * Create/record a payment
 * POST /api/v1/finance/{tenant_id}/payments
 */
export const createPaymentApi = async (
  tenantId: string,
  payload: PaymentCreateRequest
): Promise<PaymentResponse> => {
  const response = await axiosClient.post(
    `/api/v1/finance/${tenantId}/payments`,
    payload
  );
  return response.data;
};
