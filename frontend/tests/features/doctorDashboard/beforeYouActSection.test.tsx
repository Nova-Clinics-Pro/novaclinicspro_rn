/**
 * T-FE-C.3 — "Before you act" region tests (`BeforeYouActSection.tsx`).
 *
 * Mocks the governed `useClinicalWorkspaceQuery` hook directly, at the
 * same level `whyTodaySection.test.tsx`/`whatChangedSection.test.tsx` do
 * — proving the component's own render logic (loading / error /
 * recorded / absent / unresolved / unavailable per signal) without
 * re-testing the hook itself (already covered by
 * `clinicalWorkspaceDataHook.test.tsx`).
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { BeforeYouActSection } from '../../../features/episodes/presentation/components/BeforeYouActSection';
import { useClinicalWorkspaceQuery } from '../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl';
import {
  EpisodeFacts,
  PendingReviewFacts,
  PrescriptionFacts,
  SessionActivityFacts,
} from '../../../features/episodes/data/models/clinicalWorkspace.dtos';

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
const absentPendingReview: PendingReviewFacts = { pending: null, recording_state: 'absent' };
const absentSessions: SessionActivityFacts = {
  active_session_count: null,
  completed_session_count: null,
  recording_state: 'absent',
};

const queryResult = (
  overrides: Partial<{
    data:
      | {
          what_changed: { pending_review: PendingReviewFacts; sessions: SessionActivityFacts };
          prescription: PrescriptionFacts;
          episode: EpisodeFacts;
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
  pendingReview?: PendingReviewFacts;
  sessions?: SessionActivityFacts;
  prescription?: PrescriptionFacts;
  episode?: EpisodeFacts;
}) => ({
  what_changed: {
    pending_review: overrides.pendingReview ?? absentPendingReview,
    sessions: overrides.sessions ?? absentSessions,
  },
  prescription: overrides.prescription ?? absentPrescription,
  episode: overrides.episode ?? activeEpisode,
});

describe('BeforeYouActSection (T-FE-C.3, FR-VCC-4, FR-PS-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all four backend-owned signals unchanged', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({
          pendingReview: { pending: true, recording_state: 'recorded' },
          sessions: { active_session_count: 2, completed_session_count: 5, recording_state: 'recorded' },
          prescription: { exists: true, prescription_id: 'p1', document_status: 'FINAL', recording_state: 'recorded' },
          episode: { exists: true, episode_id: 'e1', status: 'ACTIVE', recording_state: 'recorded' },
        }),
      }),
    );

    const { getByText } = render(
      <BeforeYouActSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );

    expect(getByText('Before you act')).toBeTruthy();
    expect(getByText('Pending')).toBeTruthy();
    expect(getByText('FINAL')).toBeTruthy();
    expect(getByText('Active')).toBeTruthy();
    expect(getByText('2 active · 5 completed')).toBeTruthy();
  });

  it('renders pending review false distinctly from true', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({ data: dataWith({ pendingReview: { pending: false, recording_state: 'recorded' } }) }),
    );
    const { getByText, queryByText } = render(
      <BeforeYouActSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('None pending')).toBeTruthy();
    expect(queryByText('Pending')).toBeNull();
  });

  it('renders an unresolved pending-review state distinctly from absent/unavailable', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({
          pendingReview: { pending: false, recording_state: 'unresolved' },
          // Non-absent prescription/sessions so "None recorded" (from
          // those unrelated fields) can't be mistaken for the
          // pending-review row's own text in this assertion.
          prescription: { exists: true, prescription_id: 'p1', document_status: 'DRAFT', recording_state: 'recorded' },
          sessions: { active_session_count: 1, completed_session_count: 1, recording_state: 'recorded' },
        }),
      }),
    );
    const { getByText, queryByText } = render(
      <BeforeYouActSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('Unresolved')).toBeTruthy();
    expect(queryByText('None pending')).toBeNull();
    expect(queryByText('None recorded')).toBeNull();
  });

  it('renders empty/absent signals as "None recorded" — never a fabricated reassurance like "no issue" or "safe"', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ data: dataWith({}) }));
    const { getAllByText, queryByText } = render(
      <BeforeYouActSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getAllByText('None recorded').length).toBeGreaterThan(0);
    expect(queryByText(/no issue/i)).toBeNull();
    expect(queryByText(/no known/i)).toBeNull();
    expect(queryByText(/safe/i)).toBeNull();
  });

  it('renders unavailable session progress distinctly, never as "None recorded"', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({ data: dataWith({ sessions: { active_session_count: null, completed_session_count: null, recording_state: 'unavailable' } }) }),
    );
    const { getByText, queryByText } = render(
      <BeforeYouActSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('Currently unavailable')).toBeTruthy();
  });

  it.each([
    ['DRAFT'],
    ['FINAL'],
    ['SIGNED'],
  ])('renders Prescription document lifecycle state: %s', (status) => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: dataWith({
          prescription: { exists: true, prescription_id: 'p1', document_status: status, recording_state: 'recorded' },
        }),
      }),
    );
    const { getByText } = render(
      <BeforeYouActSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText(status)).toBeTruthy();
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
      <BeforeYouActSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText(expected)).toBeTruthy();
  });

  it('shows an explicit loading state and never a false reassurance while loading', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ isLoading: true }));
    const { getByText, queryByText } = render(
      <BeforeYouActSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('Loading...')).toBeTruthy();
    expect(queryByText('None recorded')).toBeNull();
    expect(queryByText('Before you act')).toBeTruthy(); // title still shown, content is not
    expect(queryByText('Pending review')).toBeNull();
  });

  it('shows an explicit error state, distinct from absence, with a retry action', () => {
    const refetch = jest.fn();
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ isError: true, refetch }));
    const { getByText, queryByText } = render(
      <BeforeYouActSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('Failed to load data. Please try again.')).toBeTruthy();
    expect(queryByText('None recorded')).toBeNull();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('calls useClinicalWorkspaceQuery with the exact identifiers passed as props — no second endpoint', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ data: dataWith({}) }));
    render(
      <BeforeYouActSection tenantId="tenant-9" clientId="client-9" episodeId="episode-9" appointmentId="appointment-9" />,
    );
    expect(mockUseClinicalWorkspaceQuery).toHaveBeenCalledWith('tenant-9', 'client-9', 'episode-9', 'appointment-9');
  });

  it('does not accept or render an allergies field even if present on the mocked response', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: {
          ...dataWith({}),
          // @ts-expect-error — intentionally simulating a field the component must ignore
          allergies: ['Penicillin'],
        },
      }),
    );
    const { queryByText } = render(
      <BeforeYouActSection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(queryByText('Penicillin')).toBeNull();
    expect(queryByText(/allerg/i)).toBeNull();
  });
});

describe('architecture — BeforeYouActSection.tsx', () => {
  const source = (() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    return fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/components/BeforeYouActSection.tsx'),
      'utf8',
    );
  })();

  const liveCode = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('imports no datasource or axios directly', () => {
    expect(liveCode).not.toMatch(/clinicalWorkspace\.api/);
    expect(liveCode).not.toMatch(/axiosClient/);
  });

  it('renders no allergy, interaction, renal, or hepatic panel and never reads an `allergies` field', () => {
    for (const forbidden of [/allerg/i, /interaction/i, /renal/i, /hepatic/i, /contraindication/i]) {
      expect(liveCode).not.toMatch(forbidden);
    }
  });

  it('does not add any other R8 scope (labs, measurements, reconciliation, attachments)', () => {
    for (const forbidden of [/\blab\b/i, /measurement/i, /reconciliation/i, /attachment/i, /FHIR/]) {
      expect(liveCode).not.toMatch(forbidden);
    }
  });

  it('never inspects raw treatment lifecycle strings', () => {
    expect(liveCode).not.toMatch(/lifecycle_status/);
    expect(liveCode).not.toMatch(/needs_clinical_review/);
    expect(liveCode).not.toMatch(/under_clinical_review/);
  });

  it('performs no local sorting, counting, or record-selection derivation, and invents no blocking/warning severity field', () => {
    expect(liveCode).not.toMatch(/\.sort\(/);
    expect(liveCode).not.toMatch(/treatment_sheet_row/);
    expect(liveCode).not.toMatch(/day_number/);
    expect(liveCode).not.toMatch(/blocking_factor/);
    expect(liveCode).not.toMatch(/waiting_role/);
    expect(liveCode).not.toMatch(/severity/i);
  });

  it('does not introduce ISSUED or DISPENSED prescription states', () => {
    expect(liveCode).not.toMatch(/ISSUED/);
    expect(liveCode).not.toMatch(/DISPENSED/);
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
