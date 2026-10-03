// @ts-nocheck -- Jest globals are intentionally supplied by the Expo test runtime.
import React from 'react';
import { render } from '@testing-library/react-native';
import { TenantInvoiceCreateScreen } from '../../../features/billing/presentation/pages/TenantInvoiceCreateScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCreateInvoiceMutation, useCreateVisitScopedInvoiceMutation } from '../../../features/billing/data/repositories/billing.repository.impl';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({ useAuth: () => ({ currentUser: { tenantId: 'tenant-1' } }) }));
jest.mock('../../../features/billing/data/repositories/billing.repository.impl', () => ({ useCreateInvoiceMutation: jest.fn(), useCreateVisitScopedInvoiceMutation: jest.fn() }));
jest.mock('../../../features/billing/presentation/components/InvoiceForm', () => ({
  InvoiceForm: ({ onSubmit }: { onSubmit: (payload: any) => void }) => { onSubmit({ client_id: 'generic-client', visit_id: 'generic-visit', invoice_number: 'INV-1', invoice_date: '2026-10-03', lines: [] }); return null; },
}));

describe('TenantInvoiceCreateScreen E.4 invocation boundary', () => {
  const genericMutate = jest.fn(); const governedMutate = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace: jest.fn(), back: jest.fn() });
    (useCreateInvoiceMutation as jest.Mock).mockReturnValue({ mutate: genericMutate, isPending: false });
    (useCreateVisitScopedInvoiceMutation as jest.Mock).mockReturnValue({ mutate: governedMutate, isPending: false });
  });
  it('uses the preserved generic mutation without appointmentId', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    render(<TenantInvoiceCreateScreen />);
    expect(genericMutate).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'generic-client', visit_id: 'generic-visit' }));
    expect(governedMutate).not.toHaveBeenCalled();
  });
  it('uses governed mutation with appointmentId and strips client and Visit authority', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ appointmentId: 'appointment-1' });
    render(<TenantInvoiceCreateScreen />);
    expect(governedMutate).toHaveBeenCalledWith(expect.objectContaining({ appointment_id: 'appointment-1', invoice_number: 'INV-1' }));
    expect(governedMutate.mock.calls[0][0]).not.toHaveProperty('client_id');
    expect(governedMutate.mock.calls[0][0]).not.toHaveProperty('visit_id');
    expect(genericMutate).not.toHaveBeenCalled();
  });
});
