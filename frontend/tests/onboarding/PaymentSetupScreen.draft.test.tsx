import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaymentSetupScreen } from '../../features/onboarding/presentation/pages/steps/PaymentSetupScreen';
import { axiosClient } from '../../core/api/axiosClient';
import { useWizardStore } from '../../features/onboarding/presentation/stores/wizard.store';

const mockRouterReplace = jest.fn();
const mockRouterBack = jest.fn();
const mockMutateAsync = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    back: mockRouterBack,
  }),
}));

jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2F6F4E', soft: '#E7F2EC' },
      surface: { default: '#FFFFFF', elevated: '#F9FAFB' },
      background: { default: '#F8F4EC' },
      border: { default: '#E5E7EB' },
      text: {
        primary: '#111827',
        secondary: '#6B7280',
        disabled: '#9CA3AF',
        onPrimary: '#FFFFFF',
      },
      feedback: {
        info: '#0EA5E9',
        infoLight: '#EFF6FF',
        error: '#EF4444',
      },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    typography: {
      h4: { fontSize: 24, fontWeight: '700' },
      h6: { fontSize: 16, fontWeight: '600' },
      body2: { fontSize: 14 },
      button: { fontSize: 14, fontWeight: '600' },
    },
  }),
}));

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useSubmitStepMutation: () => ({
    mutateAsync: (...args: any[]) => mockMutateAsync(...args),
    isPending: false,
  }),
}));

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: {
    get: jest.fn(),
  },
}));

describe('PaymentSetupScreen draft integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWizardStore.getState().reset();
    useWizardStore.getState().setStepDraft('payment_setup', { payment_methods: ['upi'] });
    useWizardStore.getState().setStepDraft('financials_and_tax', {
      tax_enabled: true,
      tax_rate: 18,
      invoice_prefix: 'INV',
    });
    (axiosClient.get as jest.Mock).mockResolvedValue({ data: {} });
    mockMutateAsync.mockResolvedValue({ next_step: null });
  });

  it('restores a local payment draft when server payment methods are absent', async () => {
    const { getByText } = render(<PaymentSetupScreen tenantId="tenant-a" />);

    await waitFor(() => {
      expect(getByText('Unsaved changes restored')).toBeTruthy();
    });

    expect(getByText('UPI')).toBeTruthy();
  });

  it('clears only the payment draft after successful submit', async () => {
    const { getByText } = render(<PaymentSetupScreen tenantId="tenant-a" />);

    await waitFor(() => {
      expect(getByText('Unsaved changes restored')).toBeTruthy();
    });

    fireEvent.press(getByText('Save & Continue'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        data: {
          payment_methods: ['upi'],
        },
        mark_complete: true,
      });
    });

    expect(useWizardStore.getState().getStepData('payment_setup')).toBeUndefined();
    expect(useWizardStore.getState().getStepData('financials_and_tax')).toEqual({
      tax_enabled: true,
      tax_rate: 18,
      invoice_prefix: 'INV',
    });
  });
});
