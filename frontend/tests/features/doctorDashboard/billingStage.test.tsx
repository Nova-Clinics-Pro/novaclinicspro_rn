import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BillingStage } from '../../../features/episodes/presentation/components/ConsultationSections/BillingStage';
import { useClinicalWorkspaceQuery } from '../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl';
import { useRouter } from 'expo-router';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl', () => ({ useClinicalWorkspaceQuery: jest.fn() }));
jest.mock('../../../core/theme/useClinicTheme', () => ({ useClinicTheme: () => ({ colors: { surface: { default: '#fff' }, border: { default: '#ddd' }, text: { primary: '#000', secondary: '#555' }, primary: { default: '#00f' }, feedback: { error: '#f00', warning: '#fa0' } }, spacing: { sm: 4, lg: 12 }, typography: { h6: {}, body2: {}, button: {} }, radii: { medium: 4 }, borderWidths: { default: 1 } }) }));
jest.mock('../../../core/localization/useTranslation', () => ({ useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => params ? `${key}:${JSON.stringify(params)}` : key }) }));

const push = jest.fn();
const capability = (enabled = true, available = true) => ({ code: 'x', entitled: true, tenant_preference: enabled, effective_enabled: enabled, effective_available: available, blocked_reason_code: null, unmet_dependencies: [], source: 'test' });
const workspace = (overrides: Record<string, unknown> = {}) => ({
  billing: { clinical_services_exist: true, invoice_exists: false, invoice_count: 2, invoice_status: null, invoice_ids: [], invoice_statuses: [], billed_amount: '100', paid_amount: '25', outstanding_amount: '75', currency: 'INR', outstanding_state: 'OUTSTANDING', recording_state: 'recorded' },
  capability: { states: { billing: capability(), 'billing.invoicing': capability() }, recording_state: 'recorded' },
  permission: { granted_codes: ['invoice.create'], recording_state: 'recorded' },
  ...overrides,
});

describe('BillingStage (T-FE-E.4)', () => {
  beforeEach(() => { jest.clearAllMocks(); (useRouter as jest.Mock).mockReturnValue({ push }); });
  const renderStage = () => render(<BillingStage tenantId="t" clientId="c" episodeId="e" appointmentId="a" />);
  it.each([
    ['unavailable', workspace({ capability: { states: { billing: capability(false, false) } } })],
    ['available but disabled', workspace({ capability: { states: { billing: capability(false, true) } } })],
  ])('hides billing when %s', (_label, data) => {
    (useClinicalWorkspaceQuery as jest.Mock).mockReturnValue({ data, isLoading: false, isError: false });
    expect(renderStage().queryByTestId('billing-stage')).toBeNull();
  });
  it.each([
    ['invoicing is disabled', workspace({ capability: { states: { billing: capability(), 'billing.invoicing': capability(false) } } })],
    ['invoice.create is absent', workspace({ permission: { granted_codes: [], recording_state: 'recorded' } })],
    ['both are absent', workspace({ capability: { states: { billing: capability(), 'billing.invoicing': capability(false) } }, permission: { granted_codes: [], recording_state: 'recorded' } })],
  ])('keeps facts read-only when %s', (_label, data) => {
    (useClinicalWorkspaceQuery as jest.Mock).mockReturnValue({ data, isLoading: false, isError: false });
    const view = renderStage(); expect(view.getByTestId('billing-stage')).toBeTruthy(); expect(view.getByText(/invoiceCount/)).toBeTruthy(); expect(view.queryByTestId('billing-create-invoice')).toBeNull();
  });
  it('renders warning and navigates only with billing.invoicing plus invoice.create', () => {
    (useClinicalWorkspaceQuery as jest.Mock).mockReturnValue({ data: workspace(), isLoading: false, isError: false });
    const view = renderStage(); expect(view.getByTestId('billing-unbilled-warning')).toBeTruthy(); fireEvent.press(view.getByTestId('billing-create-invoice'));
    expect(push).toHaveBeenCalledWith({ pathname: '/clinic-admin/billing/invoices/create', params: { appointmentId: 'a' } });
  });
});
