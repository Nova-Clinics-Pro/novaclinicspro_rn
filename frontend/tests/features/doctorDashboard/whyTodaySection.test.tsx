/**
 * T-FE-C.1 — "Why Today" region tests (`WhyTodaySection.tsx`).
 *
 * Mocks the governed `useClinicalWorkspaceQuery` hook directly (the same
 * level `visitCommandCenter.test.tsx` mocks `useEpisodeWorkspaceData` at)
 * — this proves the component's own render logic (loading / error /
 * recorded / not_recorded / unavailable, and that it never falls back to
 * appointment notes or Case Sheet chief complaint, since neither is even
 * wired into the mocked hook's return shape) without re-testing
 * `useClinicalWorkspaceQuery` itself (already covered by
 * `clinicalWorkspaceDataHook.test.tsx`).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { WhyTodaySection } from '../../../features/episodes/presentation/components/WhyTodaySection';
import { useClinicalWorkspaceQuery } from '../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl';
import { AppointmentPurposeFacts } from '../../../features/episodes/data/models/clinicalWorkspace.dtos';

jest.mock('../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl', () => ({
  useClinicalWorkspaceQuery: jest.fn(),
}));

const mockUseClinicalWorkspaceQuery = useClinicalWorkspaceQuery as jest.Mock;

const queryResult = (overrides: Partial<{
  data: { purpose: AppointmentPurposeFacts } | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: jest.Mock;
}> = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  ...overrides,
});

describe('WhyTodaySection (T-FE-C.1, FR-VCC-2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a recorded purpose value unchanged, for both the Purpose and Patient concern rows', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({ data: { purpose: { value: 'Follow-up for back pain', recording_state: 'recorded' } } }),
    );
    const { getByText, getAllByText } = render(
      <WhyTodaySection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('Why today')).toBeTruthy();
    expect(getByText('Purpose')).toBeTruthy();
    expect(getByText('Patient concern')).toBeTruthy();
    expect(getAllByText('Follow-up for back pain')).toHaveLength(2);
  });

  it('renders localized "Not recorded" when the backend recording state is not_recorded', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({ data: { purpose: { value: null, recording_state: 'not_recorded' } } }),
    );
    const { getAllByText } = render(
      <WhyTodaySection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getAllByText('Not recorded')).toHaveLength(2);
  });

  it('never renders "Not recorded" for an unavailable recording state', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({ data: { purpose: { value: null, recording_state: 'unavailable' } } }),
    );
    const { getAllByText, queryByText } = render(
      <WhyTodaySection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(queryByText('Not recorded')).toBeNull();
    expect(getAllByText('Currently unavailable')).toHaveLength(2);
  });

  it('shows an explicit loading state and never a false "Not recorded" while loading', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ isLoading: true }));
    const { getByText, queryByText } = render(
      <WhyTodaySection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('Loading...')).toBeTruthy();
    expect(queryByText('Not recorded')).toBeNull();
    expect(queryByText('Purpose')).toBeNull();
  });

  it('shows an explicit error state, distinct from not_recorded, with a retry action', () => {
    const refetch = jest.fn();
    mockUseClinicalWorkspaceQuery.mockReturnValue(queryResult({ isError: true, refetch }));
    const { getByText, queryByText } = render(
      <WhyTodaySection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('Failed to load data. Please try again.')).toBeTruthy();
    expect(queryByText('Not recorded')).toBeNull();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('calls useClinicalWorkspaceQuery with the exact identifiers passed as props — no second endpoint, no substitute source', () => {
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({ data: { purpose: { value: null, recording_state: 'not_recorded' } } }),
    );
    render(<WhyTodaySection tenantId="tenant-9" clientId="client-9" episodeId="episode-9" appointmentId="appointment-9" />);
    expect(mockUseClinicalWorkspaceQuery).toHaveBeenCalledWith('tenant-9', 'client-9', 'episode-9', 'appointment-9');
  });

  it('does not accept or render appointment notes or Case Sheet chief complaint as a substitute source', () => {
    // The mocked hook's return shape carries only `purpose` — proving structurally
    // that the component has no code path reading any other field (e.g. `notes`,
    // `casesheet.chief_complaint`) even if such a field were present on a snapshot.
    mockUseClinicalWorkspaceQuery.mockReturnValue(
      queryResult({
        data: {
          purpose: { value: null, recording_state: 'not_recorded' },
          // @ts-expect-error — intentionally simulating fields the component must ignore
          notes: 'Bring old X-rays',
          casesheet: { chief_complaint: 'Knee pain for 3 weeks' },
        },
      }),
    );
    const { queryByText, getAllByText } = render(
      <WhyTodaySection tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(queryByText('Bring old X-rays')).toBeNull();
    expect(queryByText('Knee pain for 3 weeks')).toBeNull();
    expect(getAllByText('Not recorded')).toHaveLength(2);
  });
});

describe('architecture — WhyTodaySection.tsx imports no datasource or axios', () => {
  it('has no direct clinicalWorkspace.api or axiosClient import', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/components/WhyTodaySection.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/clinicalWorkspace\.api/);
    expect(source).not.toMatch(/axiosClient/);
  });
});
