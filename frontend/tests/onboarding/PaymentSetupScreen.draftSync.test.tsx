/**
 * PaymentSetupScreen — server data / wizard draft synchronization.
 *
 * Test titles are labelled:
 *   [PARITY]  characterizes what the code does today. Pins current behavior so a later change is deliberate;
 *             not a statement that the behavior is desirable.
 *   [DESIRED] asserts behavior the product clearly requires.
 *
 * The wizard store is the real zustand store. The data layer and the storage sync are mocked.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaymentSetupScreen } from '../../features/onboarding/presentation/pages/steps/PaymentSetupScreen';
import { useWizardStore } from '../../features/onboarding/presentation/stores/wizard.store';

const mockRouterReplace = jest.fn();
const mockPaymentQuery: { current: any } = { current: { isLoading: true, data: undefined } };
const mockSubmitStep = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockRouterReplace, back: jest.fn() }) }));
// Render each icon's name as text so selected rows can be observed through their checkmark.
jest.mock('@expo/vector-icons', () => {
  const R = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return { Ionicons: ({ name }: { name: string }) => R.createElement(Text, null, `icon:${name}`) };
});
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2F6F4E', soft: '#E7F2EC' },
      surface: { default: '#FFFFFF', elevated: '#F9FAFB' },
      background: { default: '#F8F4EC' },
      border: { default: '#E5E7EB' },
      text: { primary: '#111827', secondary: '#6B7280', disabled: '#9CA3AF', onPrimary: '#FFFFFF' },
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
  usePaymentMethodsQuery: () => mockPaymentQuery.current,
  useSubmitStepMutation: () => ({ mutateAsync: mockSubmitStep, isPending: false }),
}));
jest.mock('../../features/onboarding/presentation/stores/wizard.store', () => {
  const actual = jest.requireActual('../../features/onboarding/presentation/stores/wizard.store');
  return {
    ...actual,
    clearStepDraftAndSync: jest.fn(async (stepCode: string) => {
      actual.useWizardStore.getState().clearStepDraft(stepCode);
    }),
  };
});

const SERVER = (methods: string[] = ['cash', 'upi']) => ({
  isLoading: false,
  data: { paymentMethods: methods, hasServerPaymentMethods: true },
});
const NO_SERVER = () => ({
  isLoading: false,
  data: { paymentMethods: ['cash'], hasServerPaymentMethods: false },
});
const stored = () => useWizardStore.getState().getStepData('payment_setup');
const putDraft = (methods: string[]) => useWizardStore.getState().setStepDraft('payment_setup', { payment_methods: methods });
const checkmarks = (u: ReturnType<typeof renderScreen>) => u.queryAllByText('icon:checkmark-circle').length;

const renderScreen = () => {
  const make = () => <PaymentSetupScreen tenantId="tenant-a" />;
  const utils = render(make());
  const refresh = async () => { await act(async () => { utils.rerender(make()); }); };
  return { ...utils, refresh };
};
const saveAndContinue = async (u: ReturnType<typeof renderScreen>) => {
  await act(async () => { fireEvent.press(u.getByText('Save & Continue')); });
};

let alertSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  useWizardStore.getState().reset();
  mockPaymentQuery.current = { isLoading: true, data: undefined };
  mockSubmitStep.mockResolvedValue({ next_step: null });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.useRealTimers();
  alertSpy.mockRestore();
});

describe('PaymentSetupScreen — initial load and precedence', () => {
  it('[DESIRED] shows a loading state until the server query resolves', () => {
    expect(renderScreen().getByText('Loading payment methods...')).toBeTruthy();
  });

  it('[DESIRED] server payment methods take precedence over a stored draft', async () => {
    putDraft(['card']);
    mockPaymentQuery.current = SERVER(['cash', 'upi']);
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    expect(checkmarks(u)).toBe(2);
    expect(u.queryByText('Unsaved changes restored')).toBeNull();
    await saveAndContinue(u);
    expect(mockSubmitStep).not.toHaveBeenCalled(); // unchanged server selection
  });

  it('[DESIRED] with neither server methods nor a draft, the default (cash) is selected and nothing is "restored"', async () => {
    mockPaymentQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    expect(checkmarks(u)).toBe(1);
    expect(u.queryByText('Unsaved changes restored')).toBeNull();
  });

  it('[DESIRED] with no server methods, restores the draft selection and says so', async () => {
    putDraft(['card', 'upi']);
    mockPaymentQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    expect(checkmarks(u)).toBe(2);
    await saveAndContinue(u);
    expect(mockSubmitStep).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payment_methods: ['card', 'upi'] }, mark_complete: true })
    );
  });

  it('[PARITY] a draft with a non-array payment_methods value is ignored', async () => {
    useWizardStore.getState().setStepDraft('payment_setup', { payment_methods: 'upi' });
    mockPaymentQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    expect(u.queryByText('Unsaved changes restored')).toBeNull();
    expect(checkmarks(u)).toBe(1);
  });
});

describe('PaymentSetupScreen — wizard draft that hydrates after mount', () => {
  it('[DESIRED] a draft that appears while the query is still loading is restored when the data arrives', async () => {
    const u = renderScreen();
    act(() => { putDraft(['bank_transfer']); });
    mockPaymentQuery.current = NO_SERVER();
    await u.refresh();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    await saveAndContinue(u);
    expect(mockSubmitStep).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payment_methods: ['bank_transfer'] } })
    );
  });

  it('[PARITY] a draft that only appears AFTER the server data was applied is not picked up (the store is read once, at data arrival)', async () => {
    mockPaymentQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    act(() => { putDraft(['card']); });
    await u.refresh();
    expect(u.queryByText('Unsaved changes restored')).toBeNull();
    expect(checkmarks(u)).toBe(1);
  });
});

describe('PaymentSetupScreen — editing, indicator and autosave', () => {
  it('[DESIRED] the restored indicator clears on the first edit', async () => {
    putDraft(['card']);
    mockPaymentQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    fireEvent.press(u.getByText('UPI'));
    await waitFor(() => expect(u.queryByText('Unsaved changes restored')).toBeNull());
  });

  it('[DESIRED] the last remaining method cannot be removed (alert, selection unchanged)', async () => {
    mockPaymentQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    fireEvent.press(u.getByText('Cash'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'At least one payment method is required');
    expect(checkmarks(u)).toBe(1);
  });

  it('[DESIRED] autosave writes the selected methods after 500 ms, and not before', async () => {
    mockPaymentQuery.current = SERVER(['cash']);
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    jest.useFakeTimers();
    fireEvent.press(u.getByText('Card'));
    act(() => { jest.advanceTimersByTime(499); });
    expect(stored()?.payment_methods).not.toEqual(['cash', 'card']);
    act(() => { jest.advanceTimersByTime(1); });
    expect(stored()).toEqual({ payment_methods: ['cash', 'card'] });
  });

  it('[DESIRED] only the final selection inside the window is written (debounce)', async () => {
    mockPaymentQuery.current = SERVER(['cash']);
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    jest.useFakeTimers();
    fireEvent.press(u.getByText('Card'));
    act(() => { jest.advanceTimersByTime(300); });
    fireEvent.press(u.getByText('UPI'));
    act(() => { jest.advanceTimersByTime(500); });
    expect(stored()).toEqual({ payment_methods: ['cash', 'card', 'upi'] });
  });

  it('[PARITY] persists the loaded server selection as a wizard draft after 500 ms even if the user changed nothing', async () => {
    mockPaymentQuery.current = SERVER(['cash', 'upi']);
    jest.useFakeTimers();
    renderScreen();
    expect(stored()).toBeUndefined();
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(stored()).toEqual({ payment_methods: ['cash', 'upi'] });
  });
});

describe('PaymentSetupScreen — submit and snapshots (standalone mode)', () => {
  it('[DESIRED] a no-change submit makes no API call', async () => {
    mockPaymentQuery.current = SERVER(['cash', 'upi']);
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    await saveAndContinue(u);
    expect(mockSubmitStep).not.toHaveBeenCalled();
  });

  it('[PARITY] in standalone mode a no-change submit also does not navigate', async () => {
    mockPaymentQuery.current = SERVER(['cash']);
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    await saveAndContinue(u);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('[DESIRED] adding and then removing a method returns to "no change"', async () => {
    mockPaymentQuery.current = SERVER(['cash']);
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    fireEvent.press(u.getByText('Card'));
    fireEvent.press(u.getByText('Card'));
    await saveAndContinue(u);
    expect(mockSubmitStep).not.toHaveBeenCalled();
  });

  it('[PARITY] the snapshot is order-sensitive: the same set in a different order counts as a change', async () => {
    mockPaymentQuery.current = SERVER(['cash', 'card']);
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    fireEvent.press(u.getByText('Cash'));   // ['card']
    fireEvent.press(u.getByText('Cash'));   // ['card','cash'] -- same set as the server's
    await saveAndContinue(u);
    expect(mockSubmitStep).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payment_methods: ['card', 'cash'] } })
    );
  });

  it('[DESIRED] a changed selection is submitted once, completes the step, clears only the payment draft, then navigates', async () => {
    useWizardStore.getState().setStepDraft('financials_and_tax', { tax_enabled: true, tax_rate: 18, invoice_prefix: 'INV' });
    mockPaymentQuery.current = SERVER(['cash']);
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    act(() => { putDraft(['cash', 'card']); });
    fireEvent.press(u.getByText('Card'));
    await saveAndContinue(u);
    expect(mockSubmitStep).toHaveBeenCalledTimes(1);
    expect(mockSubmitStep).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payment_methods: ['cash', 'card'] }, mark_complete: true })
    );
    expect(stored()).toBeUndefined();
    expect(useWizardStore.getState().getStepData('financials_and_tax')).toEqual({
      tax_enabled: true,
      tax_rate: 18,
      invoice_prefix: 'INV',
    });
    expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding/setup-wizard?tenantId=tenant-a');
  });

  it('[DESIRED] after a successful submit the new selection is the snapshot: submitting again makes no second call', async () => {
    mockPaymentQuery.current = SERVER(['cash']);
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    fireEvent.press(u.getByText('Card'));
    await saveAndContinue(u);
    await saveAndContinue(u);
    expect(mockSubmitStep).toHaveBeenCalledTimes(1);
  });
});

describe('PaymentSetupScreen — refetch and unsaved-edit protection', () => {
  const load = async (methods: string[] = ['cash']) => {
    mockPaymentQuery.current = SERVER(methods);
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    return u;
  };

  it('[DESIRED] a query that hands back a fresh object on every render does not cause a render loop, and edits survive', async () => {
    mockPaymentQuery.current = {
      isLoading: false,
      get data() {
        return { paymentMethods: ['cash'], hasServerPaymentMethods: true };
      },
    };
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Cash')).toBeTruthy());
    fireEvent.press(u.getByText('Card'));
    await u.refresh();
    expect(checkmarks(u)).toBe(2);
  });

  it('[DESIRED] a pristine form accepts updated server data (and the new data is the no-change baseline)', async () => {
    const u = await load(['cash']);
    mockPaymentQuery.current = SERVER(['cash', 'bank_transfer']);
    await u.refresh();
    expect(checkmarks(u)).toBe(2);
    await saveAndContinue(u);
    expect(mockSubmitStep).not.toHaveBeenCalled();
  });

  it('[DESIRED] a re-render with the same query result keeps the user edits', async () => {
    const u = await load();
    fireEvent.press(u.getByText('Card'));
    await u.refresh();
    await u.refresh();
    expect(checkmarks(u)).toBe(2);
  });

  it('[DESIRED] a dirty form keeps the whole user selection when the server data changes', async () => {
    const u = await load(['cash']);
    fireEvent.press(u.getByText('Card'));
    fireEvent.press(u.getByText('UPI'));
    expect(checkmarks(u)).toBe(3);
    mockPaymentQuery.current = SERVER(['cash', 'bank_transfer']);
    await u.refresh();
    expect(checkmarks(u)).toBe(3);
    await saveAndContinue(u);
    expect(mockSubmitStep).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payment_methods: ['cash', 'card', 'upi'] } })
    );
  });

  it('[DESIRED] a dirty form keeps its selection when the refetch returns a new object with identical content', async () => {
    const u = await load(['cash']);
    fireEvent.press(u.getByText('Card'));
    mockPaymentQuery.current = SERVER(['cash']);
    await u.refresh();
    expect(checkmarks(u)).toBe(2);
  });

  it('[DESIRED] repeated refetches do not discard the edits', async () => {
    const u = await load(['cash']);
    fireEvent.press(u.getByText('Card'));
    for (const m of [['cash', 'upi'], ['cash', 'bank_transfer'], ['cash']]) {
      mockPaymentQuery.current = SERVER(m);
      await u.refresh();
    }
    expect(checkmarks(u)).toBe(2);
  });

  it('[DESIRED] the 500 ms autosave persists the protected user selection, not the refetched server selection', async () => {
    const u = await load(['cash']);
    jest.useFakeTimers();
    fireEvent.press(u.getByText('Card'));
    mockPaymentQuery.current = SERVER(['cash', 'bank_transfer']);
    await u.refresh();
    act(() => { jest.advanceTimersByTime(500); });
    expect(stored()).toEqual({ payment_methods: ['cash', 'card'] });
  });

  it('[DESIRED] editing back to the baseline makes the form pristine again (it accepts server data)', async () => {
    const u = await load(['cash']);
    fireEvent.press(u.getByText('Card'));
    fireEvent.press(u.getByText('Card'));
    mockPaymentQuery.current = SERVER(['cash', 'upi']);
    await u.refresh();
    expect(checkmarks(u)).toBe(2);
  });

  it('[DESIRED] a refetch while dirty moves the baseline to the new server data: the edited form is still submitted', async () => {
    const u = await load(['cash']);
    fireEvent.press(u.getByText('Card'));
    mockPaymentQuery.current = SERVER(['cash', 'upi']);
    await u.refresh();
    await saveAndContinue(u);
    expect(mockSubmitStep).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payment_methods: ['cash', 'card'] } })
    );
  });

  it('[DESIRED] if the protected selection happens to equal the new server data, nothing is sent', async () => {
    const u = await load(['cash']);
    fireEvent.press(u.getByText('Card'));
    mockPaymentQuery.current = SERVER(['cash', 'card']);
    await u.refresh();
    await saveAndContinue(u);
    expect(mockSubmitStep).not.toHaveBeenCalled();
  });

  it('[DESIRED] after a successful submit the saved selection is the baseline and the form is no longer dirty', async () => {
    const u = await load(['cash']);
    fireEvent.press(u.getByText('Card'));
    await saveAndContinue(u);
    expect(mockSubmitStep).toHaveBeenCalledTimes(1);
    mockPaymentQuery.current = SERVER(['cash', 'bank_transfer', 'upi']);
    await u.refresh();
    expect(checkmarks(u)).toBe(3);
    await saveAndContinue(u);
    expect(mockSubmitStep).toHaveBeenCalledTimes(1);
  });

  it('[DESIRED] an edit made after a restored draft is protected from server methods that arrive later', async () => {
    putDraft(['card']);
    mockPaymentQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    fireEvent.press(u.getByText('UPI'));
    mockPaymentQuery.current = SERVER(['cash']);
    await u.refresh();
    expect(checkmarks(u)).toBe(2);
  });

  it('[PARITY] an untouched restored draft is replaced when server methods arrive, and the indicator goes away', async () => {
    putDraft(['card']);
    mockPaymentQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    mockPaymentQuery.current = SERVER(['cash', 'upi']);
    await u.refresh();
    expect(checkmarks(u)).toBe(2);
    await waitFor(() => expect(u.queryByText('Unsaved changes restored')).toBeNull());
  });
});
