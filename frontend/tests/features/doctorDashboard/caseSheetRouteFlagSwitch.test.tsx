import React from 'react';
import { render } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import { useLocalSearchParams } from 'expo-router';
import { useFeatures } from '../../../core/hooks/useFeatures';

/**
 * Phase 4 (R4) · T-E.3b — the Case Sheet standalone routes
 * (`.../casesheets/[casesheetId]/edit.tsx`, `.../casesheets/new.tsx`) now
 * render the canonical `CasesheetStandaloneScreen` (T-B.2) UNCONDITIONALLY.
 *
 * SUPERSEDES the R3B · T-B.3 flag-switch suite this file used to contain:
 * the `isClinicalSpineV1Enabled` OFF-path (`CasesheetEditScreen`/
 * `CreateCasesheetScreen`/`CasesheetForm.tsx`) has been deleted per T-E.3's
 * own parity audit finding no capability gap -- there is no flag branch
 * left to test. The "flag OFF" tests and the "OFF-path preservation"
 * describe block that used to live here are removed, not modified, since
 * there is nothing left for them to prove. The MIG-1 "every known caller"
 * sub-suite is kept verbatim -- it never depended on the flag or the old
 * screens, only on the routes' own deep-link surface.
 */

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ back: jest.fn() }),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text testID="workspace-redirect">{href}</Text>;
  },
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: jest.fn(),
  isCosV1Enabled: (features: { cos_v1_enabled?: boolean }) => Boolean(features.cos_v1_enabled),
}));
jest.mock('../../../features/episodes/presentation/components/InvalidWorkspaceState', () => ({
  InvalidWorkspaceState: () => {
    const { Text } = require('react-native');
    return <Text testID="invalid-workspace-context">invalid</Text>;
  },
}));
jest.mock('../../../features/casesheets/presentation/pages/CasesheetStandaloneScreen', () => ({
  CasesheetStandaloneScreen: (props: any) => {
    const { Text } = require('react-native');
    return <Text testID="standalone-screen-props">{JSON.stringify(props)}</Text>;
  },
}));

import EditCasesheetRoute from '../../../app/clinic-admin/clients/[clientId]/casesheets/[casesheetId]/edit';
import NewCasesheetRoute from '../../../app/clinic-admin/clients/[clientId]/casesheets/new';

describe('Case Sheet standalone routes render the canonical core only (R4 · T-E.3b)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: false });
  });

  describe('edit.tsx', () => {
    it('renders CasesheetStandaloneScreen with clientId/casesheetId from route params', () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ clientId: 'client-1', casesheetId: 'casesheet-1' });
      const { getByTestId } = render(<EditCasesheetRoute />);
      const props = JSON.parse(getByTestId('standalone-screen-props').props.children);
      expect(props).toEqual({ clientId: 'client-1', casesheetId: 'casesheet-1' });
    });
  });

  describe('new.tsx', () => {
    it('renders CasesheetStandaloneScreen with clientId + optional appointmentId/episodeId from route params', () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        clientId: 'client-1',
        appointmentId: 'appointment-1',
        episodeId: 'episode-1',
      });
      const { getByTestId } = render(<NewCasesheetRoute />);
      const props = JSON.parse(getByTestId('standalone-screen-props').props.children);
      expect(props).toEqual({ clientId: 'client-1', appointmentId: 'appointment-1', episodeId: 'episode-1' });
    });

    it('works with only clientId present — no dangling failure for the CasesheetsListScreen "Add Casesheet" caller, which passes no appointmentId/episodeId', () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ clientId: 'client-1' });
      const { getByTestId } = render(<NewCasesheetRoute />);
      const props = JSON.parse(getByTestId('standalone-screen-props').props.children);
      expect(props.clientId).toBe('client-1');
    });
  });

  describe('cos_v1 transition', () => {
    it('redirects explicit Episode and Visit context into the Case Sheet workspace stage', () => {
      (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: true });
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        clientId: 'client-1', appointmentId: 'appointment-1', episodeId: 'episode-1',
      });
      const { getByTestId } = render(<NewCasesheetRoute />);
      expect(getByTestId('workspace-redirect').props.children).toBe(
        '/clinic-admin/episodes/episode-1/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor&step=case_sheet',
      );
    });

    it('fails safely rather than inferring missing Episode or Visit identity', () => {
      (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: true });
      (useLocalSearchParams as jest.Mock).mockReturnValue({ clientId: 'client-1' });
      expect(render(<NewCasesheetRoute />).getByTestId('invalid-workspace-context')).toBeTruthy();
    });
  });

  describe('MIG-1: every known caller of these two routes is unchanged (no dangling deep link, no caller needed updating)', () => {
    const appointmentDetailScreen = fs.readFileSync(
      path.resolve(__dirname, '../../../features/appointments/presentation/pages/AppointmentDetailScreen.tsx'),
      'utf8',
    );
    const episodeWorkspaceScreen = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/pages/EpisodeWorkspaceScreen.tsx'),
      'utf8',
    );
    const casesheetsListScreen = fs.readFileSync(
      path.resolve(__dirname, '../../../features/casesheets/presentation/pages/CasesheetsListScreen.tsx'),
      'utf8',
    );
    const casesheetDetailScreen = fs.readFileSync(
      path.resolve(__dirname, '../../../features/casesheets/presentation/pages/CasesheetDetailScreen.tsx'),
      'utf8',
    );

    it('AppointmentDetailScreen (T-0.4\'s own finding) still routes to casesheets/new — automatically covered by the route, no caller change needed', () => {
      expect(appointmentDetailScreen).toContain('casesheets/new?appointmentId=');
    });

    it('EpisodeWorkspaceScreen still routes to casesheets/new — automatically covered', () => {
      expect(episodeWorkspaceScreen).toContain('/casesheets/new');
    });

    it('CasesheetsListScreen still routes to casesheets/new (clientId only) and casesheets/[casesheetId] (detail, unaffected by this task) — automatically covered', () => {
      expect(casesheetsListScreen).toContain("pathname: '/clinic-admin/clients/[clientId]/casesheets/new'");
    });

    it('CasesheetDetailScreen still routes to casesheets/[casesheetId]/edit — automatically covered', () => {
      expect(casesheetDetailScreen).toContain("pathname: '/clinic-admin/clients/[clientId]/casesheets/[casesheetId]/edit'");
    });
  });

  describe('no old-editor fallback remains', () => {
    it('the two route files no longer import CasesheetEditScreen/CreateCasesheetScreen', () => {
      const editRoute = fs.readFileSync(
        path.resolve(__dirname, '../../../app/clinic-admin/clients/[clientId]/casesheets/[casesheetId]/edit.tsx'),
        'utf8',
      );
      const newRoute = fs.readFileSync(
        path.resolve(__dirname, '../../../app/clinic-admin/clients/[clientId]/casesheets/new.tsx'),
        'utf8',
      );
      expect(editRoute).not.toMatch(/import\s*\{[^}]*CasesheetEditScreen/);
      expect(newRoute).not.toMatch(/import\s*\{[^}]*CreateCasesheetScreen/);
      expect(editRoute).not.toMatch(/isClinicalSpineV1Enabled\(/);
      expect(newRoute).not.toMatch(/isClinicalSpineV1Enabled\(/);
    });
  });
});
