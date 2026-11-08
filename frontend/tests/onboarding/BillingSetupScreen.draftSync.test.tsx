/**
 * BillingSetupScreen — server data / wizard draft synchronization.
 *
 * Every test is labelled in its title:
 *   [PARITY]  characterizes what the code does today. These pin current behavior so a later change is deliberate;
 *             they are NOT a statement that the behavior is desirable.
 *   [DESIRED] asserts behavior the product clearly requires (correct values, no needless API call, ...).
 *
 * The wizard store is the real zustand store. The data layer and the storage sync are mocked.
 */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { BillingSetupScreen } from '../../features/onboarding/presentation/pages/steps/BillingSetupScreen';
import { useWizardStore } from '../../features/onboarding/presentation/stores/wizard.store';

const mockRouterReplace = jest.fn();
const mockBillingQuery: { current: any } = { current: { isLoading: true, data: undefined } };
const mockSaveBilling = jest.fn();
const mockSubmitStep = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockRouterReplace, back: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
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
  useBillingSettingsQuery: () => mockBillingQuery.current,
  useSaveBillingSettingsMutation: () => ({ mutateAsync: mockSaveBilling }),
  useSubmitStepMutation: () => ({ mutateAsync: mockSubmitStep, isPending: false }),
}));
jest.mock('../../features/onboarding/presentation/stores/wizard.store', () => {
  const actual = jest.requireActual('../../features/onboarding/presentation/stores/wizard.store');
  return {
    ...actual,
    // Same effect as the real one on the in-memory store, without touching storage.
    clearStepDraftAndSync: jest.fn(async (stepCode: string) => {
      actual.useWizardStore.getState().clearStepDraft(stepCode);
    }),
  };
});

const SERVER = (over: Record<string, unknown> = {}) => ({
  isLoading: false,
  data: { taxEnabled: true, taxRate: '12', invoicePrefix: 'SRV', hasServerBillingSettings: true, ...over },
});
const NO_SERVER = () => ({
  isLoading: false,
  data: { taxEnabled: true, taxRate: '18', invoicePrefix: 'INV', hasServerBillingSettings: false },
});
const draft = (over: Record<string, unknown> = {}) => ({
  tax_enabled: true,
  tax_rate: 9,
  invoice_prefix: 'DRAFT',
  ...over,
});
const stored = () => useWizardStore.getState().getStepData('financials_and_tax');
const putDraft = (d: ReturnType<typeof draft>) => useWizardStore.getState().setStepDraft('financials_and_tax', d);

const renderScreen = () => {
  const make = () => <BillingSetupScreen tenantId="tenant-a" />;
  const utils = render(make());
  // A fresh element so the re-render re-reads the mocked query.
  const refresh = async () => { await act(async () => { utils.rerender(make()); }); };
  return { ...utils, refresh };
};
const prefix = (u: ReturnType<typeof renderScreen>) => u.getByPlaceholderText('INV');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  useWizardStore.getState().reset();
  mockBillingQuery.current = { isLoading: true, data: undefined };
  mockSaveBilling.mockResolvedValue(undefined);
  mockSubmitStep.mockResolvedValue({ next_step: null });
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('BillingSetupScreen — initial load and precedence', () => {
  it('[DESIRED] shows a loading state until the server query resolves', () => {
    const u = renderScreen();
    expect(u.getByText('Loading billing settings...')).toBeTruthy();
  });

  it('[DESIRED] server settings take precedence over a stored wizard draft', async () => {
    putDraft(draft());
    mockBillingQuery.current = SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('SRV'));
    expect(u.getByDisplayValue('12')).toBeTruthy();
    expect(u.queryByText('Unsaved changes restored')).toBeNull();
  });

  it('[DESIRED] with neither server settings nor a draft, shows the defaults without a restored indicator', async () => {
    mockBillingQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('INV'));
    expect(u.getByDisplayValue('18')).toBeTruthy();
    expect(u.queryByText('Unsaved changes restored')).toBeNull();
  });

  it('[DESIRED] with no server settings, restores the wizard draft and says so', async () => {
    putDraft(draft());
    mockBillingQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    expect(prefix(u).props.value).toBe('DRAFT');
    expect(u.getByDisplayValue('9')).toBeTruthy();
  });
});

describe('BillingSetupScreen — wizard draft that hydrates after mount', () => {
  it('[DESIRED] a draft that appears while the query is still loading is restored when the data arrives', async () => {
    const u = renderScreen(); // mounted with nothing: store empty, query loading
    act(() => { putDraft(draft({ invoice_prefix: 'LATE' })); }); // storage hydration lands after mount
    mockBillingQuery.current = NO_SERVER();
    await u.refresh();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    expect(prefix(u).props.value).toBe('LATE');
  });

  it('[PARITY] a draft that only appears AFTER the server data was applied is not picked up (the store is read once, at data arrival)', async () => {
    mockBillingQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('INV'));
    act(() => { putDraft(draft({ invoice_prefix: 'TOO_LATE' })); });
    await u.refresh();
    expect(prefix(u).props.value).toBe('INV');
    expect(u.queryByText('Unsaved changes restored')).toBeNull();
  });
});

describe('BillingSetupScreen — restored indicator', () => {
  it('[DESIRED] clears on the first user edit', async () => {
    putDraft(draft());
    mockBillingQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    fireEvent.changeText(prefix(u), 'EDITED');
    await waitFor(() => expect(u.queryByText('Unsaved changes restored')).toBeNull());
  });

  it('[PARITY] does not come back if the user edits and then types the restored value again', async () => {
    putDraft(draft());
    mockBillingQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    fireEvent.changeText(prefix(u), 'EDITED');
    await waitFor(() => expect(u.queryByText('Unsaved changes restored')).toBeNull());
    fireEvent.changeText(prefix(u), 'DRAFT');
    expect(u.queryByText('Unsaved changes restored')).toBeNull();
  });
});

describe('BillingSetupScreen — autosave to the wizard draft (500 ms)', () => {
  it('[DESIRED] writes the edited values after 500 ms, and not before', async () => {
    mockBillingQuery.current = SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('SRV'));
    jest.useFakeTimers();
    fireEvent.changeText(prefix(u), 'ABC');
    act(() => { jest.advanceTimersByTime(499); });
    expect(stored()?.invoice_prefix).not.toBe('ABC');
    act(() => { jest.advanceTimersByTime(1); });
    expect(stored()).toEqual({ tax_enabled: true, tax_rate: 12, invoice_prefix: 'ABC' });
  });

  it('[DESIRED] only the last edit inside the window is written (debounce)', async () => {
    mockBillingQuery.current = SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('SRV'));
    jest.useFakeTimers();
    fireEvent.changeText(prefix(u), 'A');
    act(() => { jest.advanceTimersByTime(300); });
    fireEvent.changeText(prefix(u), 'AB');
    act(() => { jest.advanceTimersByTime(300); });
    expect(stored()?.invoice_prefix).not.toBe('A');
    act(() => { jest.advanceTimersByTime(200); });
    expect(stored()?.invoice_prefix).toBe('AB');
  });

  it('[DESIRED] stores a zero rate when tax is disabled', async () => {
    mockBillingQuery.current = SERVER({ taxEnabled: false, taxRate: '12' });
    jest.useFakeTimers(); // before render, so the autosave timer scheduled on load is the fake one
    renderScreen();
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(stored()).toEqual({ tax_enabled: false, tax_rate: 0, invoice_prefix: 'SRV' });
  });

  it('[PARITY] persists the loaded server values as a wizard draft after 500 ms even if the user changed nothing', async () => {
    mockBillingQuery.current = SERVER();
    jest.useFakeTimers();
    renderScreen();
    expect(stored()).toBeUndefined();
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(stored()).toEqual({ tax_enabled: true, tax_rate: 12, invoice_prefix: 'SRV' });
  });
});

describe('BillingSetupScreen — submit and snapshots (standalone mode)', () => {
  const saveAndContinue = async (u: ReturnType<typeof renderScreen>) => {
    await act(async () => { fireEvent.press(u.getByText('Save & Continue')); });
  };

  it('[DESIRED] unchanged server values: no PATCH and no step submission', async () => {
    mockBillingQuery.current = SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('SRV'));
    await saveAndContinue(u);
    expect(mockSaveBilling).not.toHaveBeenCalled();
    expect(mockSubmitStep).not.toHaveBeenCalled();
  });

  it('[DESIRED] editing and then restoring the server value is still "no change" (snapshot is the server value)', async () => {
    mockBillingQuery.current = SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('SRV'));
    fireEvent.changeText(prefix(u), 'TEMP');
    fireEvent.changeText(prefix(u), 'SRV');
    await saveAndContinue(u);
    expect(mockSaveBilling).not.toHaveBeenCalled();
  });

  it('[DESIRED] an edited value is PATCHed, then the step is completed, then the draft is cleared', async () => {
    mockBillingQuery.current = SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('SRV'));
    act(() => { putDraft(draft()); });
    fireEvent.changeText(prefix(u), 'NEW');
    await saveAndContinue(u);
    expect(mockSaveBilling).toHaveBeenCalledWith({ tax_enabled: true, tax_rate: 12, invoice_prefix: 'NEW' });
    expect(mockSubmitStep).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tax_enabled: true, tax_rate: 12, invoice_prefix: 'NEW' }, mark_complete: true })
    );
    expect(stored()).toBeUndefined();
    expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding/setup-wizard?tenantId=tenant-a');
  });

  it('[DESIRED] a restored draft that differs from the server defaults is saved', async () => {
    putDraft(draft());
    mockBillingQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    await saveAndContinue(u);
    expect(mockSaveBilling).toHaveBeenCalledWith({ tax_enabled: true, tax_rate: 9, invoice_prefix: 'DRAFT' });
  });

  it('[DESIRED] a restored draft identical to the loaded values does not trigger a PATCH', async () => {
    putDraft(draft({ tax_rate: 18, invoice_prefix: 'INV' })); // same as the server-side defaults
    mockBillingQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    await saveAndContinue(u);
    expect(mockSaveBilling).not.toHaveBeenCalled();
  });

  it('[PARITY] in standalone mode an unchanged submit just returns: no navigation either', async () => {
    mockBillingQuery.current = SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('SRV'));
    await saveAndContinue(u);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('[DESIRED] after a successful save the new values are the snapshot: saving again changes nothing', async () => {
    mockBillingQuery.current = SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('SRV'));
    fireEvent.changeText(prefix(u), 'NEW');
    await saveAndContinue(u);
    expect(mockSaveBilling).toHaveBeenCalledTimes(1);
    await saveAndContinue(u);
    expect(mockSaveBilling).toHaveBeenCalledTimes(1);
  });
});

describe('BillingSetupScreen — refetch and unsaved-edit protection', () => {
  const load = async () => {
    mockBillingQuery.current = SERVER();
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('SRV'));
    return u;
  };
  const rate = (u: ReturnType<typeof renderScreen>) => u.getByPlaceholderText('18');
  const submit = async (u: ReturnType<typeof renderScreen>) => {
    await act(async () => { fireEvent.press(u.getByText('Save & Continue')); });
  };

  it('[DESIRED] a query that hands back a fresh object on every render does not cause a render loop, and edits survive', async () => {
    mockBillingQuery.current = {
      isLoading: false,
      get data() {
        return { taxEnabled: true, taxRate: '12', invoicePrefix: 'SRV', hasServerBillingSettings: true };
      },
    };
    const u = renderScreen();
    await waitFor(() => expect(prefix(u).props.value).toBe('SRV'));
    fireEvent.changeText(prefix(u), 'MINE');
    await u.refresh();
    expect(prefix(u).props.value).toBe('MINE');
  });

  it('[DESIRED] a pristine form accepts updated server data (and the new data is the no-change baseline)', async () => {
    const u = await load();
    mockBillingQuery.current = SERVER({ invoicePrefix: 'OTHER', taxRate: '5' });
    await u.refresh();
    expect(prefix(u).props.value).toBe('OTHER');
    expect(rate(u).props.value).toBe('5');
    await submit(u);
    expect(mockSaveBilling).not.toHaveBeenCalled();
  });

  it('[DESIRED] a re-render with the same query result keeps the user edits', async () => {
    const u = await load();
    fireEvent.changeText(prefix(u), 'MINE');
    await u.refresh();
    await u.refresh();
    expect(prefix(u).props.value).toBe('MINE');
  });

  it('[DESIRED] a dirty form keeps every user-entered value when the server data changes', async () => {
    const u = await load();
    fireEvent.changeText(prefix(u), 'MINE');
    fireEvent.changeText(rate(u), '7');
    mockBillingQuery.current = SERVER({ invoicePrefix: 'OTHER', taxRate: '5', taxEnabled: false });
    await u.refresh();
    expect(prefix(u).props.value).toBe('MINE');
    expect(rate(u).props.value).toBe('7');
  });

  it('[DESIRED] the whole form is protected, not only the edited field: untouched fields do not take the server change either', async () => {
    const u = await load();
    fireEvent.changeText(prefix(u), 'MINE'); // only the prefix is edited
    mockBillingQuery.current = SERVER({ taxRate: '5' }); // server changes a different field
    await u.refresh();
    expect(prefix(u).props.value).toBe('MINE');
    expect(rate(u).props.value).toBe('12');
  });

  it('[DESIRED] a dirty form keeps its values when the refetch returns a new object with identical content', async () => {
    const u = await load();
    fireEvent.changeText(prefix(u), 'MINE');
    mockBillingQuery.current = SERVER();
    await u.refresh();
    expect(prefix(u).props.value).toBe('MINE');
  });

  it('[DESIRED] repeated refetches do not discard the edits', async () => {
    const u = await load();
    fireEvent.changeText(prefix(u), 'MINE');
    for (const p of ['A', 'B', 'C']) {
      mockBillingQuery.current = SERVER({ invoicePrefix: p });
      await u.refresh();
    }
    expect(prefix(u).props.value).toBe('MINE');
  });

  it('[DESIRED] the 500 ms autosave persists the protected user values, not the refetched server values', async () => {
    const u = await load();
    jest.useFakeTimers();
    fireEvent.changeText(prefix(u), 'MINE');
    mockBillingQuery.current = SERVER({ invoicePrefix: 'OTHER', taxRate: '5' });
    await u.refresh();
    act(() => { jest.advanceTimersByTime(500); });
    expect(stored()).toEqual({ tax_enabled: true, tax_rate: 12, invoice_prefix: 'MINE' });
  });

  it('[DESIRED] editing back to the baseline value makes the form pristine again (it accepts server data)', async () => {
    const u = await load();
    fireEvent.changeText(prefix(u), 'TEMP');
    fireEvent.changeText(prefix(u), 'SRV');
    mockBillingQuery.current = SERVER({ invoicePrefix: 'OTHER' });
    await u.refresh();
    expect(prefix(u).props.value).toBe('OTHER');
  });

  it('[DESIRED] a refetch while dirty moves the baseline to the new server data: the edited form is still submitted', async () => {
    const u = await load();
    fireEvent.changeText(prefix(u), 'MINE');
    mockBillingQuery.current = SERVER({ invoicePrefix: 'OTHER' });
    await u.refresh();
    await submit(u);
    expect(mockSaveBilling).toHaveBeenCalledWith({ tax_enabled: true, tax_rate: 12, invoice_prefix: 'MINE' });
  });

  it('[DESIRED] if the protected form happens to equal the new server data, nothing is sent', async () => {
    const u = await load();
    fireEvent.changeText(prefix(u), 'SAME');
    mockBillingQuery.current = SERVER({ invoicePrefix: 'SAME' });
    await u.refresh();
    await submit(u);
    expect(mockSaveBilling).not.toHaveBeenCalled();
  });

  it('[DESIRED] after a successful submit the saved values are the baseline and the form is no longer dirty', async () => {
    const u = await load();
    fireEvent.changeText(prefix(u), 'MINE');
    await submit(u);
    expect(mockSaveBilling).toHaveBeenCalledTimes(1);
    // not dirty any more: a later refetch is accepted
    mockBillingQuery.current = SERVER({ invoicePrefix: 'AFTER', taxRate: '3' });
    await u.refresh();
    expect(prefix(u).props.value).toBe('AFTER');
    expect(rate(u).props.value).toBe('3');
    await submit(u);
    expect(mockSaveBilling).toHaveBeenCalledTimes(1); // and the refetched data is the new baseline
  });

  it('[DESIRED] a user edit made after a restored draft is protected from server settings that arrive later', async () => {
    putDraft(draft());
    mockBillingQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    fireEvent.changeText(prefix(u), 'EDITED');
    mockBillingQuery.current = SERVER({ invoicePrefix: 'NOWSERVER' });
    await u.refresh();
    expect(prefix(u).props.value).toBe('EDITED');
  });

  it('[PARITY] an untouched restored draft is replaced when server settings arrive, and the indicator goes away', async () => {
    putDraft(draft());
    mockBillingQuery.current = NO_SERVER();
    const u = renderScreen();
    await waitFor(() => expect(u.getByText('Unsaved changes restored')).toBeTruthy());
    mockBillingQuery.current = SERVER({ invoicePrefix: 'NOWSERVER' });
    await u.refresh();
    expect(prefix(u).props.value).toBe('NOWSERVER');
    await waitFor(() => expect(u.queryByText('Unsaved changes restored')).toBeNull());
  });
});
