import React from 'react';
import * as RN from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider, getTheme } from '../../core/theme/useClinicTheme';
import { DataTable } from '../../core/components/ui/DataTable';
import { StatusBadge } from '../../core/components/ui/StatusBadge';
import { ThemedButton } from '../../core/components/ui/ThemedButton';
import { clinicTypeLabel, operationalStatusLabel, dateLabel, entitlementReason, statusLabel, trialLabel } from '../../features/tenants/application/platformTenantPresentation';
import { PlatformTenantManage } from '../../features/tenants/presentation/components/PlatformTenantManage';
import { mapPlatformTenant } from '../../features/tenants/data/repositories/platformTenants.repository';
import { platformDto } from './platformTenant.fixture';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../core/localization', () => ({ t: (key: string) => key, getCurrentLocale: () => 'en-US' }));
const tenant = mapPlatformTenant(platformDto);
it('labels elapsed ACTIVE trials as expired for display without mutating stored or canonical evidence', () => {
  expect(trialLabel(tenant, Date.parse('2026-10-30T00:00:00Z'))).toBe('platformAdmin.expired');
  expect(trialLabel(tenant, Date.parse('2026-09-30T00:00:00Z'))).toBe('platformAdmin.active');
  expect(tenant.trial?.state).toBe('ACTIVE');
  expect(tenant.entitlement.operationallyEntitled).toBe(false);
  expect(trialLabel({ ...tenant, trial: null, trialCount: 0 })).toBe('platformAdmin.notConfigured');
});
it('maps entitlement and denial reasons without exposing enums or inferring authorization', () => {
  expect(statusLabel('not_entitled')).toBe('platformAdmin.accessBlocked');
  expect(entitlementReason('no_commercial_evidence')).toBe('platformAdmin.noEntitlement');
  expect(entitlementReason('unknown_reason')).toBe('platformAdmin.reviewRequired');
  expect(statusLabel('unknown')).toBe('platformAdmin.unknownStatus');
});
it('formats timestamp with local timezone and date-only values without inventing a time', () => {
  const value = '2026-10-01T12:30:00Z';
  expect(dateLabel(value)).toBe(new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value)));
  expect(dateLabel(value)).not.toContain('T12:30:00Z');
  expect(dateLabel('2026-10-01')).not.toContain(':');
  expect(dateLabel('bad')).toBe('platformAdmin.invalidDate');
  expect(dateLabel(null)).toBe('platformAdmin.notConfigured');
});
it.each([320, 400, 1200])('uses responsive distinct cards and secondary identifiers at width %s', width => {
  const original = RN.Dimensions.get('window');
  act(() => { RN.Dimensions.set({ window: { width, height: 800, scale: 1, fontScale: 2 }, screen: { width, height: 800, scale: 1, fontScale: 2 } }); });
  const view = render(<ThemeProvider><DataTable rows={[tenant]} columns={[{ key: 'name', label: 'Synthetic column', render: row => <RN.Text>{row.code}</RN.Text> }]} /><PlatformTenantManage tenant={tenant} /></ThemeProvider>);
  expect(view.getByTestId(width < 768 ? 'manage-grid-mobile' : 'manage-grid-desktop')).toBeTruthy();
  expect(view.getByTestId(width < 768 ? 'data-table-mobile' : 'data-table-desktop')).toBeTruthy();
  for (const section of ['overview','organization','commercial','entitlement','administration','history']) expect(view.getByTestId(`manage-card-${section}`)).toBeTruthy();
  expect(view.queryByText(tenant.id)).toBeNull();
  expect(view.getByTestId('manage-card-administration')).toBeTruthy();
  expect(view.getByRole('button', { name: 'platformAdmin.prepareExtension' })).toBeEnabled();
  expect(view.getByRole('button', { name: 'platformAdmin.viewSubscription' })).toBeEnabled();
  expect(RN.StyleSheet.flatten(view.getByTestId('manage-card-overview').props.style).alignSelf).toBe('flex-start');
  expect(view.queryByRole('button', { name: 'Extend Trial' })).toBeNull();
  view.unmount(); act(() => { RN.Dimensions.set({ window: original, screen: original }); });
});
it.each(['general','ayurveda','allopathy','dental','physio','multispeciality'])('labels canonical clinic type %s without a theme-identifier assumption', value => {
  const expected = value === 'physio' ? 'physiotherapy' : value;
  expect(clinicTypeLabel(value)).toBe(`platformAdmin.${expected}`);
  expect(clinicTypeLabel(value.toUpperCase())).toBe(`platformAdmin.${expected}`);
});
it('preserves Onboarding server status even when operational activation flag is false', () => {
  const onboarding = { ...tenant, clinicType: 'ayurveda', status: 'onboarding', isActive: false };
  expect(operationalStatusLabel(onboarding)).toBe('platformAdmin.onboarding');
  const view = render(<ThemeProvider><PlatformTenantManage tenant={onboarding} /></ThemeProvider>);
  expect(view.getAllByText(/platformAdmin.ayurveda/).length).toBeGreaterThan(0);
  expect(view.getAllByText('platformAdmin.onboarding').length).toBeGreaterThan(0);
  expect(view.queryByText('platformAdmin.inactive')).toBeNull();
  expect(view.getByRole('button', { name: 'platformAdmin.prepareExtension' })).toBeEnabled();
  expect(view.getByRole('button', { name: 'platformAdmin.viewSubscription' })).toBeEnabled();
});
it.each(['AYURVEDA','GENERAL_MEDICINE','DENTAL','PHYSIOTHERAPY'] as const)('badges and compact actions use %s tokens and accessible hit targets', clinicType => {
  const theme = getTheme(clinicType);
  const view = render(<ThemeProvider clinicType={clinicType}><StatusBadge label="Synthetic blocked" tone="error" /><ThemedButton variant="subtle" label="Synthetic manage" onPress={() => {}} /></ThemeProvider>);
  expect(RN.StyleSheet.flatten(view.getByText('Synthetic blocked').props.style).color).toBe(theme.colors.feedback.error);
  const style = RN.StyleSheet.flatten(view.getByLabelText('Synthetic manage').props.style);
  expect(style.backgroundColor).toBe(theme.colors.surface.muted);
  expect(style.minHeight).toBe(theme.sizes.touchTarget);
  expect(style.alignSelf).toBe('flex-start');
});

it('prepares a bounded extension without executing a command and reveals read-only subscription details', () => {
  const view = render(<ThemeProvider><PlatformTenantManage tenant={tenant} /></ThemeProvider>);
  expect(view.getByText('platformAdmin.extensionGate')).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'platformAdmin.prepareExtension' }));
  expect(view.getByText('platformAdmin.extensionDialogTitle')).toBeTruthy();
  fireEvent.changeText(view.getByLabelText('platformAdmin.extensionReason'), 'Synthetic support investigation');
  fireEvent.press(view.getByRole('button', { name: 'platformAdmin.reviewExtension' }));
  expect(view.getByText('platformAdmin.extensionNotSentYet')).toBeTruthy();
  fireEvent.press(view.getByLabelText('common.close'));
  fireEvent.press(view.getByRole('button', { name: 'platformAdmin.viewSubscription' }));
  expect(view.getByTestId('subscription-details')).toBeTruthy();
  expect(view.getAllByText('platformAdmin.noSubscription').length).toBeGreaterThan(0);
  expect(view.queryByTestId('extension-history')).toBeNull();
  fireEvent.press(view.getByText('platformAdmin.viewExtensions'));
  expect(view.getByTestId('extension-history')).toBeTruthy();
  fireEvent.press(view.getByText('platformAdmin.viewHistory'));
  expect(view.queryByTestId('extension-history')).toBeNull();
});

it('keeps all technical identifiers behind the existing disclosure', () => {
  const view = render(<ThemeProvider><PlatformTenantManage tenant={tenant} /></ThemeProvider>);
  for (const id of [tenant.id, tenant.organization!.id, tenant.organization!.associationId]) expect(view.queryByText(id)).toBeNull();
  fireEvent.press(view.getByText('platformAdmin.showIdentifiers'));
  for (const id of [tenant.id, tenant.organization!.id, tenant.organization!.associationId]) expect(view.getByText(id)).toBeTruthy();
  fireEvent.press(view.getByText('platformAdmin.hideIdentifiers'));
  for (const id of [tenant.id, tenant.organization!.id, tenant.organization!.associationId]) expect(view.queryByText(id)).toBeNull();
});

it('distinguishes an authoritative extension record from unavailable platform audit history', () => {
  const withHistory = {
    ...tenant,
    extensionTotal: 1,
    extensions: [{
      id: 'extension-1', kind: 'DIRECT_GRANT', decision: 'APPROVED', days: 7,
      decidedAt: '2026-10-01T00:00:00Z', previousExpiresAt: '2026-10-02T00:00:00Z',
      expiresAt: '2026-10-09T00:00:00Z', reason: 'Synthetic support review',
      channel: 'SUPPORT', approverId: 'approved-platform-admin',
    }],
  };
  const view = render(<ThemeProvider><PlatformTenantManage tenant={withHistory} /></ThemeProvider>);
  expect(view.getByText('platformAdmin.auditUnavailable')).toBeTruthy();
  fireEvent.press(view.getByText('platformAdmin.viewExtensions'));
  expect(view.getByTestId('extension-history')).toBeTruthy();
  expect(view.getByText('Synthetic support review')).toBeTruthy();
  expect(view.getByText('approved-platform-admin')).toBeTruthy();
  expect(view.getByText('platformAdmin.support')).toBeTruthy();
});
