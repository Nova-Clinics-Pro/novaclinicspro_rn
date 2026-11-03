/**
 * Extension preparation: awaited single-tenant refresh, and the scrollable dialog UX.
 * No extension is ever submitted: the Super Admin screen has no commercial POST at all.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import * as RN from 'react-native';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import { ThemeProvider } from '../../core/theme/useClinicTheme';
import { ConfirmationDialog } from '../../core/components/ConfirmationDialog';
import { PlatformTenantManage } from '../../features/tenants/presentation/components/PlatformTenantManage';
import { mapPlatformTenant } from '../../features/tenants/data/repositories/platformTenants.repository';
import { dateLabel } from '../../features/tenants/application/platformTenantPresentation';
import { platformDto } from './platformTenant.fixture';

const mockWindow = { width: 800, height: 900, scale: 1, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => mockWindow }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../core/localization', () => ({ t: (key: string, params?: Record<string, unknown>) => params ? `${key} ${JSON.stringify(params)}` : key, getCurrentLocale: () => 'en-US' }));

const stale = mapPlatformTenant(platformDto);
const fresh = mapPlatformTenant({
  ...platformDto,
  commercial: { ...platformDto.commercial, trial: { ...platformDto.commercial.trial!, expires_at: '2026-12-31T00:00:00Z', state: 'ACTIVE', aggregate_version: 7 } },
});
const defer = <T,>() => { let resolve!: (v: T) => void; let reject!: (e: unknown) => void; const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };
const mount = (onRefresh?: (id: string) => Promise<typeof stale>) => render(<ThemeProvider><PlatformTenantManage tenant={stale} onRefresh={onRefresh} /></ThemeProvider>);
const openDialog = (view: ReturnType<typeof render>) => fireEvent.press(view.getByRole('button', { name: 'platformAdmin.prepareExtension' }));
const review = (view: ReturnType<typeof render>) => view.getByRole('button', { name: 'platformAdmin.reviewExtension' });
const fillReason = (view: ReturnType<typeof render>, text = 'Synthetic support investigation') => fireEvent.changeText(view.getByLabelText('platformAdmin.extensionReason'), text);
const staleExpiry = dateLabel(stale.trial?.expiresAt);
const freshExpiry = dateLabel(fresh.trial?.expiresAt);

describe('extension preparation refresh', () => {
  it('awaits one single-tenant refresh, keeps Review disabled meanwhile and then uses the authoritative trial information', async () => {
    const d = defer<typeof stale>();
    const onRefresh = jest.fn(() => d.promise);
    const view = mount(onRefresh);
    openDialog(view);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith(stale.id);
    expect(view.getByTestId('extension-refreshing')).toBeTruthy();
    fillReason(view);
    expect(review(view)).toBeDisabled(); // valid input, but the refresh has not completed
    expect(view.queryByText('platformAdmin.extensionNotSentYet')).toBeNull();
    expect(within(view.getByTestId('extension-trial-summary')).queryByText(staleExpiry)).toBeNull(); // stale row value is never shown
    await act(async () => { d.resolve(fresh); });
    expect(view.queryByTestId('extension-refreshing')).toBeNull();
    const summary = within(view.getByTestId('extension-trial-summary'));
    expect(summary.getByText(freshExpiry)).toBeTruthy();
    expect(freshExpiry).not.toBe(staleExpiry);
    expect(review(view)).toBeEnabled();
    fireEvent.press(review(view));
    expect(view.getByText('platformAdmin.extensionNotSentYet')).toBeTruthy();
  });

  it('a failed refresh blocks preparation, shows an actionable error and Retry works', async () => {
    const first = defer<typeof stale>(); const second = defer<typeof stale>();
    const onRefresh = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const view = mount(onRefresh);
    openDialog(view);
    fillReason(view);
    await act(async () => { first.reject(new Error('synthetic failure')); });
    expect(view.getByText('platformAdmin.extensionRefreshFailed')).toBeTruthy();
    expect(review(view)).toBeDisabled();
    expect(view.queryByText('platformAdmin.extensionNotSentYet')).toBeNull();
    fireEvent.press(view.getByRole('button', { name: 'common.retry' }));
    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(view.getByTestId('extension-refreshing')).toBeTruthy();
    await act(async () => { second.resolve(fresh); });
    expect(view.queryByText('platformAdmin.extensionRefreshFailed')).toBeNull();
    expect(review(view)).toBeEnabled();
  });

  it('repeated presses never start a duplicate refresh', async () => {
    const d = defer<typeof stale>();
    const onRefresh = jest.fn(() => d.promise);
    const view = mount(onRefresh);
    const openButton = view.getByRole('button', { name: 'platformAdmin.prepareExtension' });
    fireEvent.press(openButton); fireEvent.press(openButton); fireEvent.press(openButton);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await act(async () => { d.resolve(fresh); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('a refresh that finishes after the dialog was cancelled is discarded', async () => {
    const d = defer<typeof stale>();
    const view = mount(jest.fn(() => d.promise));
    openDialog(view);
    fireEvent.press(view.getByLabelText('Cancel'));
    await act(async () => { d.resolve(fresh); });
    expect(view.queryByText('platformAdmin.extensionDialogTitle')).toBeNull();
  });
});

describe('extension dialog UX', () => {
  const readyDialog = async (onRefresh = jest.fn(async () => fresh)) => { const view = mount(onRefresh); openDialog(view); await act(async () => {}); return view; };

  it('bounds the dialog height to the window and scrolls the body while title and actions stay outside it', async () => {
    Object.assign(mockWindow, { width: 360, height: 400 });
    const view = await readyDialog();
    const body = view.getByTestId('confirmation-dialog-body');
    let node: any = body.parent; let maxHeight: unknown;
    while (node && maxHeight === undefined) { maxHeight = RN.StyleSheet.flatten(node.props.style)?.maxHeight; node = node.parent; }
    expect(maxHeight).toBe(400 * 0.9);
    const inBody = within(body);
    expect(inBody.queryByLabelText('platformAdmin.reviewExtension')).toBeNull();
    expect(inBody.queryByLabelText('Cancel')).toBeNull();
    expect(inBody.queryByText('platformAdmin.extensionDialogTitle')).toBeNull();
    expect(view.getByLabelText('platformAdmin.reviewExtension')).toBeTruthy();
    expect(view.getByLabelText('Cancel')).toBeTruthy();
    expect(inBody.getByLabelText('platformAdmin.extensionReason')).toBeTruthy();
    Object.assign(mockWindow, { width: 800, height: 900 });
  });

  it('offers 1, 7, 14 and 30 days as an accessible selection group with the selected value indicated', async () => {
    const view = await readyDialog();
    expect(view.getByLabelText('platformAdmin.extensionDays').props.accessibilityRole).toBe('radiogroup');
    const option = (days: number) => view.getByRole('button', { name: `platformAdmin.extensionDays: ${days}` });
    for (const days of [1, 7, 14, 30]) expect(option(days)).toBeTruthy();
    expect(option(30).props.accessibilityState.selected).toBe(true);
    expect(option(7).props.accessibilityState.selected).toBe(false);
    fireEvent.press(option(7));
    expect(option(7).props.accessibilityState.selected).toBe(true);
    expect(option(30).props.accessibilityState.selected).toBe(false);
  });

  it('enforces the 160-character reason limit on the input and shows the count', async () => {
    const view = await readyDialog();
    const input = view.getByLabelText('platformAdmin.extensionReason');
    expect(input.props.maxLength).toBe(160);
    expect(input.props.multiline).toBe(true);
    fillReason(view, 'abc');
    expect(view.getByText('platformAdmin.extensionReasonCount {"count":3,"max":160}')).toBeTruthy();
  });

  it('keeps reason validation unchanged: Review is disabled until a non-blank reason exists', async () => {
    const view = await readyDialog();
    expect(review(view)).toBeDisabled();
    fillReason(view, '   ');
    expect(review(view)).toBeDisabled();
    fillReason(view, 'Synthetic reason');
    expect(review(view)).toBeEnabled();
  });

  it('cancelling resets the temporary duration and reason', async () => {
    const view = await readyDialog();
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.extensionDays: 7' }));
    fillReason(view, 'Synthetic reason');
    fireEvent.press(view.getByLabelText('Cancel'));
    openDialog(view);
    await act(async () => {});
    expect(view.getByLabelText('platformAdmin.extensionReason').props.value).toBe('');
    expect(view.getByRole('button', { name: 'platformAdmin.extensionDays: 30' }).props.accessibilityState.selected).toBe(true);
  });

  it('reviewing does not claim a grant was made', async () => {
    const view = await readyDialog();
    fillReason(view);
    fireEvent.press(review(view));
    expect(view.getByText('platformAdmin.extensionNotSentYet')).toBeTruthy(); // "No extension was sent."
  });
});

describe('shared logout dialog is unchanged', () => {
  it('without the opt-in props it renders no scroll body and an enabled confirm', () => {
    const onConfirm = jest.fn();
    const view = render(<ThemeProvider><ConfirmationDialog visible title="Synthetic title" message="Synthetic message" confirmText="Go" onConfirm={onConfirm} onCancel={jest.fn()} /></ThemeProvider>);
    expect(view.queryByTestId('confirmation-dialog-body')).toBeNull();
    expect(view.getByText('Synthetic message')).toBeTruthy();
    fireEvent.press(view.getByLabelText('Go'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('the logout hook does not use the new dialog props', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../core/hooks/useLogoutConfirmation.ts'), 'utf8');
    expect(source).not.toMatch(/scrollBody|confirmDisabled/);
  });
});

describe('extension read-only review state', () => {
  const REASON = 'Synthetic support investigation';
  const readyDialog = async (onRefresh = jest.fn(async () => fresh)) => { const view = mount(onRefresh); openDialog(view); await act(async () => {}); return view; };
  const enterReview = async () => {
    const view = await readyDialog();
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.extensionDays: 7' }));
    fillReason(view, `  ${REASON}  `);
    fireEvent.press(review(view));
    return view;
  };

  it('replaces the form with a read-only summary of tenant, current expiry, duration and reason', async () => {
    const view = await enterReview();
    const summary = within(view.getByTestId('extension-review'));
    expect(summary.getByText(stale.name)).toBeTruthy();
    expect(summary.getByText(freshExpiry)).toBeTruthy(); // from the targeted refresh
    expect(summary.queryByText(staleExpiry)).toBeNull();
    expect(summary.getByText('7')).toBeTruthy();
    expect(summary.getByText(REASON)).toBeTruthy();
    expect(view.queryByLabelText('platformAdmin.extensionReason')).toBeNull(); // no editable form
    expect(view.queryByRole('button', { name: 'platformAdmin.extensionDays: 7' })).toBeNull();
  });

  it('shows "not sent yet" first in the body with the grant explanation, and no second Review action', async () => {
    const view = await enterReview();
    const body = within(view.getByTestId('confirmation-dialog-body'));
    expect(body.getByText('platformAdmin.extensionNotSentYet')).toBeTruthy();
    expect(body.getByText('platformAdmin.extensionReviewGate')).toBeTruthy();
    // The notice is the first element of the review, above the summary: nothing scrolls it out of view.
    const first = view.getByTestId('extension-review').children[0] as any;
    expect(within(first).getByText('platformAdmin.extensionNotSentYet')).toBeTruthy();
    expect(within(first).queryByText(stale.name)).toBeNull();
    expect(view.queryByLabelText('platformAdmin.reviewExtension')).toBeNull();
    expect(view.getByLabelText('platformAdmin.grantExtension')).toBeTruthy();
    expect(view.getByLabelText('platformAdmin.backToEdit')).toBeTruthy();
    expect(view.getByLabelText('common.close')).toBeTruthy();
  });

  it('issues no network or grant call on review', async () => {
    const post = jest.fn();
    const spy = jest.spyOn(globalThis as any, 'fetch').mockImplementation(post as any);
    const onRefresh = jest.fn(async () => fresh);
    const view = await readyDialog(onRefresh);
    fillReason(view);
    fireEvent.press(review(view));
    expect(onRefresh).toHaveBeenCalledTimes(1); // only the preparation read
    expect(post).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('Back to edit keeps days and reason and the refreshed values', async () => {
    const onRefresh = jest.fn(async () => fresh);
    const view = await readyDialog(onRefresh);
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.extensionDays: 14' }));
    fillReason(view, REASON);
    fireEvent.press(review(view));
    fireEvent.press(view.getByLabelText('platformAdmin.backToEdit'));
    expect(view.getByLabelText('platformAdmin.extensionReason').props.value).toBe(REASON);
    expect(view.getByRole('button', { name: 'platformAdmin.extensionDays: 14' }).props.accessibilityState.selected).toBe(true);
    expect(within(view.getByTestId('extension-trial-summary')).getByText(freshExpiry)).toBeTruthy();
    expect(onRefresh).toHaveBeenCalledTimes(1); // no re-fetch
    expect(review(view)).toBeEnabled();
    expect(view.queryByTestId('extension-review')).toBeNull();
  });

  it('editing days or reason after returning clears the review', async () => {
    const view = await enterReview();
    fireEvent.press(view.getByLabelText('platformAdmin.backToEdit'));
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.extensionDays: 1' }));
    expect(view.queryByTestId('extension-review')).toBeNull();
    fireEvent.press(review(view));
    expect(view.getByTestId('extension-review')).toBeTruthy();
    fireEvent.press(view.getByLabelText('platformAdmin.backToEdit'));
    fillReason(view, 'Another reason');
    expect(view.queryByTestId('extension-review')).toBeNull();
    expect(review(view)).toBeEnabled();
  });

  it('Close resets the temporary form and review state', async () => {
    const view = await enterReview();
    fireEvent.press(view.getByLabelText('common.close'));
    expect(view.queryByTestId('extension-review')).toBeNull();
    openDialog(view);
    await act(async () => {});
    expect(view.queryByTestId('extension-review')).toBeNull();
    expect(view.getByLabelText('platformAdmin.extensionReason').props.value).toBe('');
    expect(view.getByRole('button', { name: 'platformAdmin.extensionDays: 30' }).props.accessibilityState.selected).toBe(true);
  });

  it('invalid input or an unsuccessful refresh cannot enter review', async () => {
    const invalid = await readyDialog();
    expect(review(invalid)).toBeDisabled();
    fillReason(invalid, '   ');
    expect(review(invalid)).toBeDisabled();
    expect(invalid.queryByTestId('extension-review')).toBeNull();
    invalid.unmount();

    const d = defer<typeof stale>();
    const pending = mount(jest.fn(() => d.promise));
    openDialog(pending);
    fillReason(pending);
    expect(review(pending)).toBeDisabled();
    await act(async () => { d.reject(new Error('synthetic failure')); });
    expect(review(pending)).toBeDisabled();
    expect(pending.queryByTestId('extension-review')).toBeNull();
  });

  it('keeps the title and actions reachable at a constrained height', async () => {
    Object.assign(mockWindow, { width: 360, height: 400 });
    const view = await enterReview();
    const body = within(view.getByTestId('confirmation-dialog-body'));
    expect(body.getByTestId('extension-review')).toBeTruthy();
    expect(body.queryByLabelText('platformAdmin.grantExtension')).toBeNull();
    expect(body.queryByLabelText('common.close')).toBeNull();
    expect(view.getByLabelText('platformAdmin.grantExtension')).toBeTruthy();
    expect(view.getByLabelText('common.close')).toBeTruthy();
    expect(body.getByLabelText('platformAdmin.backToEdit')).toBeTruthy(); // reachable by scrolling
    expect(view.getByText('platformAdmin.extensionDialogTitle')).toBeTruthy();
    Object.assign(mockWindow, { width: 800, height: 900 });
  });
});

describe('review state boundaries', () => {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  it('only the application hook layer of features/tenants reaches the commercial feature; presentation never touches transport', () => {
    const files = walk(path.resolve(__dirname, '../../features/tenants')).filter(f => /\.tsx?$/.test(f));
    const importers = files.filter(f => /commercialPlatform/.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(path.resolve(__dirname, '../../features/tenants'), f));
    expect(importers).toEqual(['presentation/hooks/usePlatformTrialCommands.ts']);
    for (const file of files.filter(f => /presentation/.test(f))) expect(fs.readFileSync(file, 'utf8')).not.toMatch(/axios|datasources|\/api\/v1|commercial-trial\.api/);
  });

  it('en-US and hi-IN platformAdmin keys stay in parity and carry the new strings', () => {
    const load = (l: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../core/localization/translations/${l}.json`), 'utf8')).platformAdmin;
    const en = load('en-US'); const hi = load('hi-IN');
    expect(Object.keys(en).sort()).toEqual(Object.keys(hi).sort());
    for (const key of ['extensionDialogMessage', 'extensionReviewGate', 'extensionNotSentYet', 'backToEdit', 'grantExtension', 'extensionGranted', 'initializeTrial', 'initializeTrialTitle', 'initializeTrialMessage', 'trialInitialized', 'commandForbidden', 'commandConflict', 'commandFailed']) { expect(en[key]).toBeTruthy(); expect(hi[key]).toBeTruthy(); }
    expect(en.extensionDialogMessage).not.toMatch(/unavailable|cannot submit/i);
    expect(en.extensionPendingGate).toBeUndefined();
  });
});

describe('real command submission', () => {
  const REASON = 'Synthetic support investigation';
  const grantResult = { aggregateVersion: 8, expiresAt: '2027-01-30T00:00:00Z', state: 'ACTIVE' };
  const makeCommands = (over: Partial<{ grant: jest.Mock; initialize: jest.Mock }> = {}) => ({ grant: over.grant ?? jest.fn(async () => grantResult), initialize: over.initialize ?? jest.fn(async () => grantResult) });
  const mountWith = (commands: any, tenant = stale) => render(<ThemeProvider><PlatformTenantManage tenant={tenant} onRefresh={async () => fresh} commands={commands} /></ThemeProvider>);
  const reviewState = async (commands: any) => {
    const view = mountWith(commands); openDialog(view); await act(async () => {});
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.extensionDays: 7' }));
    fillReason(view, REASON); fireEvent.press(review(view));
    return view;
  };

  it('grants through the command with the refreshed aggregate version and shows the backend expiry', async () => {
    const commands = makeCommands(); const view = await reviewState(commands);
    expect(commands.grant).not.toHaveBeenCalled(); // review alone sends nothing
    await act(async () => { fireEvent.press(view.getByLabelText('platformAdmin.grantExtension')); });
    expect(commands.grant).toHaveBeenCalledTimes(1);
    expect(commands.grant).toHaveBeenCalledWith(stale.organization!.id, stale.id, expect.objectContaining({ aggregateVersion: 7, extensionDays: 7, reason: REASON, idempotencyKey: expect.any(String) }));
    expect(view.queryByText('platformAdmin.extensionDialogTitle')).toBeNull(); // closed after success
    expect(view.getByTestId('trial-command-outcome')).toBeTruthy();
    expect(view.getByText(/platformAdmin\.extensionGranted/).props.children).toContain(dateLabel(grantResult.expiresAt));
  });

  it('a failed grant shows an error, no success, and a retry reuses the same idempotency key', async () => {
    const grant = jest.fn().mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'CommercialTrialError', kind: 'BACKEND_FAILURE', retryable: true })).mockResolvedValueOnce(grantResult);
    const view = await reviewState(makeCommands({ grant }));
    await act(async () => { fireEvent.press(view.getByLabelText('platformAdmin.grantExtension')); });
    expect(view.getByText('platformAdmin.commandFailed')).toBeTruthy();
    expect(view.queryByTestId('trial-command-outcome')).toBeNull();
    expect(view.getByTestId('extension-review')).toBeTruthy();
    await act(async () => { fireEvent.press(view.getByLabelText('platformAdmin.grantExtension')); });
    expect(grant).toHaveBeenCalledTimes(2);
    expect(grant.mock.calls[1][2].idempotencyKey).toBe(grant.mock.calls[0][2].idempotencyKey);
    expect(view.getByTestId('trial-command-outcome')).toBeTruthy();
  });

  it('editing after returning starts a new attempt key', async () => {
    const grant = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(grantResult);
    const view = await reviewState(makeCommands({ grant }));
    await act(async () => { fireEvent.press(view.getByLabelText('platformAdmin.grantExtension')); });
    fireEvent.press(view.getByLabelText('platformAdmin.backToEdit'));
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.extensionDays: 14' }));
    fireEvent.press(review(view));
    await act(async () => { fireEvent.press(view.getByLabelText('platformAdmin.grantExtension')); });
    expect(grant.mock.calls[1][2].idempotencyKey).not.toBe(grant.mock.calls[0][2].idempotencyKey);
    expect(grant.mock.calls[1][2].extensionDays).toBe(14);
  });

  it('a double press submits once', async () => {
    const d = defer<typeof grantResult>(); const grant = jest.fn(() => d.promise);
    const view = await reviewState(makeCommands({ grant }));
    const button = view.getByLabelText('platformAdmin.grantExtension');
    fireEvent.press(button);
    expect(grant).toHaveBeenCalledTimes(1);
    expect(view.getByLabelText('platformAdmin.grantExtension')).toBeDisabled(); // loading blocks a second press
    await act(async () => { d.resolve(grantResult); });
  });

  it('without commands the grant action is disabled', async () => {
    const view = await reviewState(undefined);
    expect(view.getByLabelText('platformAdmin.grantExtension')).toBeDisabled();
  });
});

describe('legacy clinic initialization', () => {
  const legacy = mapPlatformTenant({ ...platformDto, commercial: { ...platformDto.commercial, trial: null, trial_count: 0, extensions: [], extension_total: 0, entitlement: { state: 'not_entitled', plan_code: null, valid_until: null, denial_reason: 'no_commercial_evidence', operationally_entitled: false } as any } });
  const result = { aggregateVersion: 2, expiresAt: '2026-12-02T00:00:00Z', state: 'ACTIVE' };

  it('offers initialization instead of extension when the clinic has no trial record', () => {
    const view = render(<ThemeProvider><PlatformTenantManage tenant={legacy} commands={{ initialize: jest.fn(), grant: jest.fn() } as any} /></ThemeProvider>);
    expect(legacy.trial).toBeNull();
    expect(view.getByText('platformAdmin.initializeTrialGate')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'platformAdmin.prepareExtension' })).toBeNull();
  });

  it('initializes through the command after confirmation and reports the backend expiry; nothing is sent before', async () => {
    const initialize = jest.fn(async () => result);
    const view = render(<ThemeProvider><PlatformTenantManage tenant={legacy} commands={{ initialize, grant: jest.fn() } as any} /></ThemeProvider>);
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.initializeTrial' }));
    expect(initialize).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(view.getByLabelText('platformAdmin.initializeTrial')); });
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledWith(legacy.organization!.id, legacy.id, expect.any(String));
    expect(view.getByTestId('trial-command-outcome')).toBeTruthy();
    expect(view.getByText(/platformAdmin\.trialInitialized/).props.children).toContain(dateLabel(result.expiresAt));
  });

  it('a failed initialization shows an error and no success', async () => {
    const initialize = jest.fn().mockRejectedValue(new Error('x'));
    const view = render(<ThemeProvider><PlatformTenantManage tenant={legacy} commands={{ initialize, grant: jest.fn() } as any} /></ThemeProvider>);
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.initializeTrial' }));
    await act(async () => { fireEvent.press(view.getByLabelText('platformAdmin.initializeTrial')); });
    expect(view.getByText('platformAdmin.commandFailed')).toBeTruthy();
    expect(view.queryByTestId('trial-command-outcome')).toBeNull();
  });

  it('a clinic with a trial keeps the extension flow and no initialization', () => {
    const view = render(<ThemeProvider><PlatformTenantManage tenant={stale} commands={{ initialize: jest.fn(), grant: jest.fn() } as any} /></ThemeProvider>);
    expect(view.queryByRole('button', { name: 'platformAdmin.initializeTrial' })).toBeNull();
    expect(view.getByRole('button', { name: 'platformAdmin.prepareExtension' })).toBeTruthy();
  });
});
