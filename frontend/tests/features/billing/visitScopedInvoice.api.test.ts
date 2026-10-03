import { axiosClient } from '../../../core/api/axiosClient';
import { createVisitScopedInvoiceApi } from '../../../features/billing/data/datasources/billing.api';
jest.mock('../../../core/api/axiosClient', () => ({ axiosClient: { post: jest.fn() } }));
describe('visit-scoped invoice API', () => {
  it('sends appointment context and invoice content only to the governed endpoint', async () => {
    (axiosClient.post as jest.Mock).mockResolvedValue({ data: { id: 'invoice-1' } });
    const payload = { appointment_id: 'appointment-1', invoice_number: 'INV-1', invoice_date: '2026-10-03', lines: [] };
    await createVisitScopedInvoiceApi('tenant-1', payload);
    expect(axiosClient.post).toHaveBeenCalledWith('/api/v1/finance/tenant-1/invoices/visit-scoped', payload);
    expect(axiosClient.post.mock.calls[0][1]).not.toHaveProperty('client_id');
    expect(axiosClient.post.mock.calls[0][1]).not.toHaveProperty('visit_id');
  });
});
