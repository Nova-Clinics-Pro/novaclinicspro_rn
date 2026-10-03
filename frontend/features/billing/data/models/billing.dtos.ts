/**
 * Billing DTOs
 * Data Transfer Objects matching OpenAPI schemas for billing operations
 * 
 * Note: Status and payment method values are kept flexible - we display
 * whatever the API returns and map known values to friendly labels.
 */

// ============================================
// KNOWN STATUS/METHOD VALUES (for UI mapping)
// ============================================

/** Known invoice status values (for label mapping) */
export const KNOWN_INVOICE_STATUSES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6B7280' },
  DRAFT: { label: 'Draft', color: '#6B7280' },
  sent: { label: 'Sent', color: '#3B82F6' },
  SENT: { label: 'Sent', color: '#3B82F6' },
  pending: { label: 'Pending', color: '#F59E0B' },
  PENDING: { label: 'Pending', color: '#F59E0B' },
  paid: { label: 'Paid', color: '#10B981' },
  PAID: { label: 'Paid', color: '#10B981' },
  partially_paid: { label: 'Partially Paid', color: '#8B5CF6' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: '#8B5CF6' },
  overdue: { label: 'Overdue', color: '#EF4444' },
  OVERDUE: { label: 'Overdue', color: '#EF4444' },
  cancelled: { label: 'Cancelled', color: '#6B7280' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280' },
  void: { label: 'Void', color: '#6B7280' },
  VOID: { label: 'Void', color: '#6B7280' },
};

/** Known payment method values */
export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'RAZORPAY', label: 'Razorpay' },
  { value: 'OTHER', label: 'Other' },
];

/** Known payment status values */
export const KNOWN_PAYMENT_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#F59E0B' },
  PENDING: { label: 'Pending', color: '#F59E0B' },
  success: { label: 'Success', color: '#10B981' },
  SUCCESS: { label: 'Success', color: '#10B981' },
  completed: { label: 'Completed', color: '#10B981' },
  COMPLETED: { label: 'Completed', color: '#10B981' },
  failed: { label: 'Failed', color: '#EF4444' },
  FAILED: { label: 'Failed', color: '#EF4444' },
  refunded: { label: 'Refunded', color: '#8B5CF6' },
  REFUNDED: { label: 'Refunded', color: '#8B5CF6' },
};

// ============================================
// REQUEST DTOs
// ============================================

/** Invoice line item create request */
export interface InvoiceLineCreateRequest {
  line_type: string;
  treatment_id?: string | null;
  inventory_item_id?: string | null;
  description?: string | null;
  quantity: number | string;
  unit_price: number | string;
  discount_amount?: number | string;
  tax_percentage?: number | string;
  tax_amount?: number | string;
  line_total?: number | string;
}

/** Create invoice request */
export interface InvoiceCreateRequest {
  client_id: string;
  visit_id?: string | null;
  appointment_id?: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  subtotal_amount?: number | string | null;
  tax_amount?: number | string | null;
  discount_amount?: number | string | null;
  total_amount?: number | string | null;
  status?: string;
  currency?: string;
  lines?: InvoiceLineCreateRequest[];
}

/** R7 governed input: client and Visit ownership are backend-derived. */
export interface VisitScopedInvoiceCreateRequest extends Omit<InvoiceCreateRequest, 'client_id' | 'visit_id' | 'appointment_id'> {
  appointment_id: string;
}

/** Update invoice request */
export interface InvoiceUpdateRequest {
  due_date?: string | null;
  subtotal_amount?: number | string | null;
  tax_amount?: number | string | null;
  discount_amount?: number | string | null;
  total_amount?: number | string | null;
  status?: string | null;
}

/** Create payment request */
export interface PaymentCreateRequest {
  invoice_id: string;
  client_id: string;
  payment_date: string;
  amount: number | string;
  payment_method: string;
  reference?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  status?: string;
}

// ============================================
// QUERY PARAMS
// ============================================

/** List invoices params */
export interface ListInvoicesParams {
  client_id?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

/** List payments params */
export interface ListPaymentsParams {
  skip?: number;
  limit?: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

/** Invoice line item response */
export interface InvoiceLineResponse {
  id: string;
  tenant_id: string;
  invoice_id: string;
  line_type: string;
  treatment_id: string | null;
  inventory_item_id: string | null;
  description: string | null;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  tax_percentage: string;
  tax_amount: string;
  line_total: string;
  created_at: string;
}

/** Invoice response */
export interface InvoiceResponse {
  id: string;
  tenant_id: string;
  client_id: string;
  visit_id: string | null;
  appointment_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal_amount: string | null;
  tax_amount: string | null;
  discount_amount: string | null;
  total_amount: string | null;
  status: string;
  currency: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  lines?: InvoiceLineResponse[];
}

/** Payment response */
export interface PaymentResponse {
  id: string;
  tenant_id: string;
  invoice_id: string;
  client_id: string;
  payment_date: string;
  amount: string;
  payment_method: string;
  reference: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
}

/** Paginated invoice list response */
export interface InvoiceListResponse {
  items: InvoiceResponse[];
  total: number;
  skip: number;
  limit: number;
}

/** Payment list response */
export interface PaymentListResponse {
  items: PaymentResponse[];
  total: number;
  skip: number;
  limit: number;
}

/** Subscription summary (derived from invoices) */
export interface SubscriptionSummary {
  outstandingBalance: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  nextDueDate: string | null;
  nextDueAmount: number | null;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get invoice status display info */
export const getInvoiceStatusInfo = (status: string): { label: string; color: string } => {
  return KNOWN_INVOICE_STATUSES[status] || { label: status || 'Unknown', color: '#6B7280' };
};

/** Get payment status display info */
export const getPaymentStatusInfo = (status: string): { label: string; color: string } => {
  return KNOWN_PAYMENT_STATUSES[status] || { label: status || 'Unknown', color: '#6B7280' };
};

/** Get payment method label */
export const getPaymentMethodLabel = (method: string): string => {
  const found = PAYMENT_METHODS.find((m) => m.value === method);
  return found?.label || method || 'Unknown';
};

/** Parse decimal string to number */
export const parseAmount = (amount: string | number | null): number => {
  if (amount === null || amount === undefined) return 0;
  if (typeof amount === 'number') return amount;
  const parsed = parseFloat(amount);
  return isNaN(parsed) ? 0 : parsed;
};

/** Format currency amount */
export const formatCurrency = (
  amount: string | number | null,
  currency: string | null = 'INR'
): string => {
  const value = parseAmount(amount);
  const symbol = currency === 'INR' || !currency ? '₹' : currency;
  return `${symbol}${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/** Format date for display */
export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/** Format date and time for display */
export const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

/** Check if invoice is overdue */
export const isInvoiceOverdue = (invoice: InvoiceResponse): boolean => {
  if (!invoice.due_date) return false;
  const status = invoice.status.toLowerCase();
  if (status === 'paid' || status === 'cancelled' || status === 'void') return false;
  try {
    const dueDate = new Date(invoice.due_date);
    return dueDate < new Date();
  } catch {
    return false;
  }
};

/** Check if invoice is paid */
export const isInvoicePaid = (invoice: InvoiceResponse): boolean => {
  const status = invoice.status.toLowerCase();
  return status === 'paid' || status === 'completed';
};

/** Calculate line total */
export const calculateLineTotal = (
  quantity: number,
  unitPrice: number,
  discountAmount: number = 0,
  taxAmount: number = 0
): number => {
  const subtotal = quantity * unitPrice;
  return subtotal - discountAmount + taxAmount;
};

/** Calculate invoice totals from lines */
export const calculateInvoiceTotals = (
  lines: InvoiceLineCreateRequest[]
): { subtotal: number; tax: number; discount: number; total: number } => {
  let subtotal = 0;
  let tax = 0;
  let discount = 0;

  lines.forEach((line) => {
    const qty = parseAmount(line.quantity);
    const price = parseAmount(line.unit_price);
    const lineTax = parseAmount(line.tax_amount ?? null);
    const lineDiscount = parseAmount(line.discount_amount ?? null);

    subtotal += qty * price;
    tax += lineTax;
    discount += lineDiscount;
  });

  return {
    subtotal,
    tax,
    discount,
    total: subtotal + tax - discount,
  };
};

/** Generate invoice number */
export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};

/** Get today's date in ISO format */
export const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

/** Get date 30 days from now in ISO format */
export const getDueDate30Days = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};
