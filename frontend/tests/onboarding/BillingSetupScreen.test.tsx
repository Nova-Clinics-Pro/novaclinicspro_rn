import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { axiosClient } from '../../core/api/axiosClient';
import {
  getBillingSettingsApi,
  saveBillingSettingsApi,
} from '../../features/onboarding/data/datasources/onboarding.api';
import { BillingSetupScreen } from '../../features/onboarding/presentation/pages/steps/BillingSetupScreen';
import { useWizardStore } from '../../features/onboarding/presentation/stores/wizard.store';
import type { RevisionAwareSaveHandler } from '../../features/onboarding/presentation/hooks/useDraftConflictRecovery';

const mockRouterReplace = jest.fn();
const mockRouterBack = jest.fn();
const mockBillingSettingsQuery = jest.fn();
const mockSaveBilling = jest.fn();
const mockSubmitStep = jest.fn();

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockRouterReplace, back: mockRouterBack }),
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
      feedback: { info: '#0EA5E9', infoLight: '#EFF6FF', error: '#EF4444' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    typography: {
      h4: { fontSize: 24 },
      h6: { fontSize: 16 },
      body2: { fontSize: 14 },
      caption: { fontSize: 12 },
      button: { fontSize: 14 },
    },
  }),
}));

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useBillingSettingsQuery: (...args: unknown[]) => mockBillingSettingsQuery(...args),
  useSaveBillingSettingsMutation: () => ({ mutateAsync: mockSaveBilling }),
  useSubmitStepMutation: () => ({ mutateAsync: mockSubmitStep, isPending: false }),
}));

jest.mock('../../features/onboarding/presentation/stores/wizard.store', () => {
  const actual = jest.requireActual(
    '../../features/onboarding/presentation/stores/wizard.store'
  );
  return {
    ...actual,
    clearStepDraftAndSync: jest.fn().mockResolvedValue(undefined),
  };
});

const mockGet = axiosClient.get as jest.Mock;
const mockPatch = axiosClient.patch as jest.Mock;

describe('BillingSetup datasource contract', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses a successful tenant read without invoking fallback', async () => {
    mockGet.mockResolvedValueOnce({
      data: { tax_enabled: true, tax_rate: 18, invoice_prefix: 'NC' },
    });

    await expect(getBillingSettingsApi('tenant-a')).resolves.toEqual({
      taxEnabled: true,
      taxRate: '18',
      invoicePrefix: 'NC',
      hasServerBillingSettings: true,
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/tenants/tenant-a');
  });

  it('does not invoke fallback when a successful primary response lacks billing data', async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    await expect(getBillingSettingsApi('tenant-a')).resolves.toEqual({
      taxEnabled: false,
      taxRate: '0',
      invoicePrefix: 'INV',
      hasServerBillingSettings: false,
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('uses the tenant-scoped clinic settings fallback only when primary throws', async () => {
    mockGet
      .mockRejectedValueOnce(new Error('tenant read failed'))
      .mockResolvedValueOnce({
        data: { billing: { tax_enabled: true, tax_rate: 5, invoice_prefix: 'ALT' } },
      });

    await expect(getBillingSettingsApi('tenant-b')).resolves.toEqual({
      taxEnabled: true,
      taxRate: '5',
      invoicePrefix: 'ALT',
      hasServerBillingSettings: true,
    });
    expect(mockGet.mock.calls).toEqual([
      ['/api/v1/tenants/tenant-b'],
      ['/api/v1/clinic/tenant-b/settings'],
    ]);
  });

  it('patches billing settings through the explicit tenant path', async () => {
    mockPatch.mockResolvedValueOnce({ data: {} });
    const input = { tax_enabled: true, tax_rate: 12, invoice_prefix: 'BILL' };

    await saveBillingSettingsApi('tenant-c', input);

    expect(mockPatch).toHaveBeenCalledWith('/api/v1/tenants/tenant-c', input);
  });
});

describe('BillingSetupScreen boundary and sequencing', () => {
  let registeredSaveHandler: RevisionAwareSaveHandler | null;

  beforeEach(() => {
    jest.clearAllMocks();
    registeredSaveHandler = null;
    useWizardStore.getState().reset();
    mockBillingSettingsQuery.mockReturnValue({
      isLoading: false,
      data: {
        taxEnabled: false,
        taxRate: '0',
        invoicePrefix: 'INV',
        hasServerBillingSettings: false,
      },
    });
    mockSaveBilling.mockResolvedValue(undefined);
    mockSubmitStep.mockResolvedValue({ next_step: null });
  });

  const renderWizard = () =>
    render(
      <BillingSetupScreen
        tenantId="tenant-a"
        isWizardMode
        onRegisterSaveHandler={(handler) => {
          registeredSaveHandler = handler;
        }}
      />
    );

  it('restores the billing draft only when the query reports no server settings', async () => {
    useWizardStore.getState().setStepDraft('financials_and_tax', {
      tax_enabled: true,
      tax_rate: 9,
      invoice_prefix: 'DRAFT',
    });

    const { getByText, getByDisplayValue } = renderWizard();

    await waitFor(() => expect(getByText('Unsaved changes restored')).toBeTruthy());
    expect(mockBillingSettingsQuery).toHaveBeenCalledWith('tenant-a');
    expect(getByDisplayValue('DRAFT')).toBeTruthy();
    expect(getByDisplayValue('9')).toBeTruthy();
  });

  it('keeps resolved server state as the no-change snapshot', async () => {
    mockBillingSettingsQuery.mockReturnValue({
      isLoading: false,
      data: {
        taxEnabled: true,
        taxRate: '18',
        invoicePrefix: 'SERVER',
        hasServerBillingSettings: true,
      },
    });
    renderWizard();
    await waitFor(() => expect(registeredSaveHandler).not.toBeNull());

    await act(async () => {
      await registeredSaveHandler!();
    });

    expect(mockSaveBilling).not.toHaveBeenCalled();
    expect(mockSubmitStep).not.toHaveBeenCalled();
  });

  it('awaits billing PATCH before completing the onboarding step', async () => {
    const order: string[] = [];
    useWizardStore.getState().setStepDraft('financials_and_tax', {
      tax_enabled: true,
      tax_rate: 7,
      invoice_prefix: 'DRAFT',
    });
    mockSaveBilling.mockImplementation(async () => {
      order.push('patch');
    });
    mockSubmitStep.mockImplementation(async () => {
      order.push('complete');
      return { next_step: null };
    });
    renderWizard();
    await waitFor(() => expect(registeredSaveHandler).not.toBeNull());

    await act(async () => {
      await registeredSaveHandler!();
    });

    expect(order).toEqual(['patch', 'complete']);
    expect(mockSaveBilling).toHaveBeenCalledWith({
      tax_enabled: true,
      tax_rate: 7,
      invoice_prefix: 'DRAFT',
    });
  });

  it('does not complete the onboarding step when billing PATCH fails', async () => {
    useWizardStore.getState().setStepDraft('financials_and_tax', {
      tax_enabled: true,
      tax_rate: 7,
      invoice_prefix: 'DRAFT',
    });
    mockSaveBilling.mockRejectedValueOnce(new Error('patch failed'));
    renderWizard();
    await waitFor(() => expect(registeredSaveHandler).not.toBeNull());

    let rejection: unknown;
    await act(async () => {
      try {
        await registeredSaveHandler!();
      } catch (error) {
        rejection = error;
      }
    });

    expect(rejection).toEqual(expect.objectContaining({ message: 'patch failed' }));
    expect(mockSubmitStep).not.toHaveBeenCalled();
  });

  it('contains no direct transport ownership', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../features/onboarding/presentation/pages/steps/BillingSetupScreen.tsx'
      ),
      'utf8'
    );
    expect(source).not.toMatch(/axiosClient|\bfetch\s*\(|\/api\/v1\//);
  });
});
