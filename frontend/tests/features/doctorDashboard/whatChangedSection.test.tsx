/**
 * T-FE-C.2 — "What changed" region tests (`WhatChangedSection.tsx`).
 *
 * Mocks the governed `useClinicalWorkspaceQuery` hook directly, at the
 * same level `whyTodaySection.test.tsx` does — proving the component's
 * own render logic (loading / error / recorded / absent / not_recorded /
 * unavailable per signal) without re-testing the hook itself (already
 * covered by `clinicalWorkspaceDataHook.test.tsx`).
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { WhatChangedSection } from '../../../features/episodes/presentation/components/WhatChangedSection';
import { useClinicalWorkspaceQuery } from '../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl';
import { WhatChangedFacts, PrescriptionFacts, EpisodeFacts, BillingFacts } from '../../../features/episodes/data/models/clinicalWorkspace.dtos';

jest.mock('../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl', () => ({
  useClinicalWorkspaceQuery: jest.fn(),
}));

const mockUseClinicalWorkspaceQuery = useClinicalWorkspaceQuery as jest.Mock;

const absentPrescription: PrescriptionFacts = {
  exists: false,
  prescription_id: null,
  document_status: null,
  recording_state: 'absent',
};
const activeEpisode: EpisodeFacts = {
  exists: true,
  episode_id: 'e1',
  status: 'ACTIVE',
  recording_state: 'recorded',
};
const unavailableBilling: BillingFacts = {
  clinical_services_exist: null,
  invoice_exists: null,
  invoice_status: null,
  outstanding_state: 'not_applicable',
  recording_state: 'unavailable',
  invoice_count: null,
  invoice_ids: [],
  invoice_statuses: [],
  billed_amount: null,
  paid_amount: null,
  outstanding_amount: null,
  currency: null,
};
const absentWhatChanged: WhatChangedFacts = {
  previous_visit: { exists: false, visit_id: null, visit_date: null, outcome_notes: null, recording_state: 'absent' },
  sessions: { active_session_count: null, completed_session_count: null, recording_state: 'absent' },
  pending_review: { pending: null, recording_state: 'absent' },
};

const queryResult = (
  overrides: Partial<{
    data:
      | {
          what_changed: WhatChangedFacts;
          prescription: PrescriptionFacts;
          episode: EpisodeFacts;
          billing: BillingFacts;
        }
      | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: jest.Mock;
  }> = {},
) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  ...overrides,
});

const dataWith = (overrides: {
  whatChanged?: Partial<WhatChangedFacts>;
  prescription?: PrescriptionFacts;
  episode?: EpisodeFacts;
  billing?: BillingFacts;
}) => ({
  what_changed: { ...absentWhatChanged, ...overrides.whatChanged },
  prescription: overrides.prescription ?? absentPrescription,
  episode: overrides.episode ?? activeEpisode,
  billing: overrides.billing ?? unavailableBilling,
});

describe('WhatChangedSection (T-FE-C.2, FR-VCC-3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all eight recorded signals from backend facts unchanged', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({
          whatChanged: {
            previous_visit: {
              exists: true,
              visit_id: 'v0',
              visit_date: '2026-06-01',
              outcome_notes: 'Patient reported improvement.',
              recording_state: 'recorded',
            },
            sessions: { active_session_count: 2, completed_session_count: 5, recording_state: 'recorded' },
            pending_review: { pending: true, recording_state: 'recorded' },
          },
          prescription: { exists: true, prescription_id: 'p1', document_status: 'FINAL', recording_state: 'recorded' },
          episode: { exists: true, episode_id: 'e1', status: 'ACTIVE', recording_state: 'recorded' },
          billing: {
            ...unavailableBilling,
            invoice_exists: true,
            invoice_status: 'sent',
            outstanding_state: 'recorded',
            recording_state: 'recorded',
            outstanding_amount: '500',
            currency: 'INR',
          },
        }),
      }),
    );

    const { getByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );

    expect(getByText('What changed')).toBeTruthy();
    expect(getByText('2026-06-01')).toBeTruthy();
    expect(getByText('Patient reported improvement.')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
    expect(getByText('Pending')).toBeTruthy();
    expect(getByText('FINAL')).toBeTruthy();
    expect(getByText('Active')).toBeTruthy();
    expect(getByText('INR 500')).toBeTruthy();
  });

  it('renders "None recorded" (never "No changes") when there is no previous Visit', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ data: dataWith({}) }));
    const { getAllByText, queryByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(queryByText('No changes')).toBeNull();
    expect(getAllByText('None recorded').length).toBeGreaterThan(0);
  });

  it('renders "Not recorded" for a previous Visit summary when outcome_notes is absent, never fabricated', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({
          whatChanged: {
            previous_visit: {
              exists: true,
              visit_id: 'v0',
              visit_date: '2026-06-01',
              outcome_notes: null,
              recording_state: 'recorded',
            },
          },
        }),
      }),
    );
    const { getByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('2026-06-01')).toBeTruthy();
    expect(getByText('Not recorded')).toBeTruthy();
  });

  it('renders the explicit backend active session count', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({
          whatChanged: { sessions: { active_session_count: 3, completed_session_count: 0, recording_state: 'recorded' } },
        }),
      }),
    );
    const { getByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('3')).toBeTruthy();
  });

  it('renders the explicit backend completed session count', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({
          whatChanged: { sessions: { active_session_count: 0, completed_session_count: 7, recording_state: 'recorded' } },
        }),
      }),
    );
    const { getByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('7')).toBeTruthy();
  });

  it('renders "Pending" when the backend pending-review fact is true', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({ data: dataWith({ whatChanged: { pending_review: { pending: true, recording_state: 'recorded' } } }) }),
    );
    const { getByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('Pending')).toBeTruthy();
  });

  it('renders "None pending" when the backend pending-review fact is false', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({ data: dataWith({ whatChanged: { pending_review: { pending: false, recording_state: 'recorded' } } }) }),
    );
    const { getByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('None pending')).toBeTruthy();
  });

  it('renders Prescription absent as "None recorded" (shared with the other absent What Changed rows)', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({ data: dataWith({ prescription: absentPrescription }) }),
    );
    const { getAllByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getAllByText('None recorded').length).toBeGreaterThan(0);
  });

  it.each([
    ['DRAFT', { exists: true, prescription_id: 'p1', document_status: 'DRAFT', recording_state: 'recorded' }, 'DRAFT'],
    ['FINAL', { exists: true, prescription_id: 'p1', document_status: 'FINAL', recording_state: 'recorded' }, 'FINAL'],
    ['SIGNED', { exists: true, prescription_id: 'p1', document_status: 'SIGNED', recording_state: 'recorded' }, 'SIGNED'],
  ])('renders Prescription document lifecycle state: %s', (_label, prescription, expected) => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({ data: dataWith({ prescription: prescription as PrescriptionFacts }) }),
    );
    const { getByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText(expected)).toBeTruthy();
  });

  it.each([
    ['ACTIVE', 'Active'],
    ['CLOSED', 'Closed'],
  ])('renders Episode status: %s', (status, expected) => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({ episode: { exists: true, episode_id: 'e1', status, recording_state: 'recorded' } }),
      }),
    );
    const { getByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText(expected)).toBeTruthy();
  });

  it('renders billing absent as "None recorded"', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({
          billing: { ...unavailableBilling, invoice_exists: false, outstanding_state: 'absent', recording_state: 'recorded' },
        }),
      }),
    );
    const { getAllByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getAllByText('None recorded').length).toBeGreaterThan(0);
  });

  it('renders billing outstanding amount and currency, concatenated only — never recomputed', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({
          billing: {
            ...unavailableBilling,
            invoice_exists: true,
            outstanding_state: 'recorded',
            recording_state: 'recorded',
            outstanding_amount: '250',
            currency: 'INR',
          },
        }),
      }),
    );
    const { getByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('INR 250')).toBeTruthy();
  });

  it('renders billing invoice status when paid and no outstanding amount is present', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({
          billing: {
            ...unavailableBilling,
            invoice_exists: true,
            invoice_status: 'paid',
            outstanding_state: 'recorded',
            recording_state: 'recorded',
            outstanding_amount: null,
          },
        }),
      }),
    );
    const { getByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('paid')).toBeTruthy();
  });

  it('renders "Currently unavailable" for billing when unavailable — never "No changes"', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ data: dataWith({}) }));
    const { getAllByText, queryByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(queryByText('No changes')).toBeNull();
    expect(getAllByText('Currently unavailable').length).toBeGreaterThan(0);
  });

  it('shows an explicit loading state and never a false "None recorded"/"No changes" while loading', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ isLoading: true }));
    const { getByText, queryByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('Loading...')).toBeTruthy();
    expect(queryByText('None recorded')).toBeNull();
    expect(queryByText('No changes')).toBeNull();
  });

  it('shows an explicit error state, distinct from absence, with a retry action', () => {
    const refetch = jest.fn();
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ isError: true, refetch }));
    const { getByText, queryByText } = render(
      <WhatChangedSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('Failed to load data. Please try again.')).toBeTruthy();
    expect(queryByText('None recorded')).toBeNull();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('calls useClinicalWorkspaceQuery with the exact identifiers passed as props — no second endpoint', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ data: dataWith({}) }));
    render(
      <WhatChangedSection tenantId="tenant-9" clientId="client-9" episodeId="episode-9" appointmentId="appointment-9" />,
    );
    expect(mockUseClinicalWorkspaceQuery).toHaveBeenCalledWith('tenant-9', 'client-9', 'episode-9', 'appointment-9');
  });
});

describe('architecture — WhatChangedSection.tsx', () => {
  const source = (() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    return fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/components/WhatChangedSection.tsx'),
      'utf8',
    );
  })();

  // Live-code-only view — strips block/line comments so the component's
  // own explanatory prose (which legitimately names the backend concepts
  // it deliberately does NOT inspect, e.g. "never inspects
  // needs_clinical_review") is never mistaken for the prohibited pattern
  // itself. Mirrors the backend architecture scan's own
  // "interpret explanatory comments separately" rule.
  const liveCode = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('imports no datasource or axios directly', () => {
    expect(liveCode).not.toMatch(/clinicalWorkspace\.api/);
    expect(liveCode).not.toMatch(/axiosClient/);
  });

  it('never inspects raw treatment lifecycle strings', () => {
    expect(liveCode).not.toMatch(/lifecycle_status/);
    expect(liveCode).not.toMatch(/needs_clinical_review/);
    expect(liveCode).not.toMatch(/under_clinical_review/);
  });

  it('performs no local sorting, counting, or record-selection derivation', () => {
    expect(liveCode).not.toMatch(/\.sort\(/);
    expect(liveCode).not.toMatch(/treatment_sheet_row/);
    expect(liveCode).not.toMatch(/day_number/);
    expect(liveCode).not.toMatch(/\.rows\b/);
    // No arithmetic on billing amounts (string concatenation only).
    expect(liveCode).not.toMatch(/outstanding_amount\s*[-+*/]/);
    expect(liveCode).not.toMatch(/billed_amount\s*-/);
  });

  it('does not introduce ISSUED or DISPENSED prescription states', () => {
    expect(liveCode).not.toMatch(/ISSUED/);
    expect(liveCode).not.toMatch(/DISPENSED/);
  });

  it('does not add any R8 scope (labs, measurements, allergies, attachments)', () => {
    for (const forbidden of [
      /\blab\b/i,
      /measurement/i,
      /allerg/i,
      /interaction/i,
      /reconciliation/i,
      /attachment/i,
      /FHIR/,
    ]) {
      expect(liveCode).not.toMatch(forbidden);
    }
  });

  it('has no raw reusable style values (icon size, touch target, border width, radius-as-spacing)', () => {
    expect(source).not.toMatch(/size=\{\d+\}/);
    expect(source).not.toMatch(/minHeight:\s*\d/);
    expect(source).not.toMatch(/minWidth:\s*\d/);
    expect(source).not.toMatch(/borderWidth:\s*\d/);
    expect(source).not.toMatch(/borderRadius:\s*spacing\./);
    expect(source).toMatch(/borderWidth:\s*borderWidths\.default/);
    expect(source).toMatch(/borderRadius:\s*radii\.medium/);
  });
});
