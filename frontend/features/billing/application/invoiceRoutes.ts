/** Canonical routes for existing billing screens. */
export const governedInvoiceCreateRoute = (appointmentId: string) =>
  ({ pathname: '/clinic-admin/billing/invoices/create', params: { appointmentId } } as const);
