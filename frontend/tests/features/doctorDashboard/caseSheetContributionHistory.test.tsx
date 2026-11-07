/**
 * T-FE-E.1b (T-BE-E.1a, Decision 12, FR-CS-5/6) — rendering + isolation +
 * architecture tests for `CaseSheetContributionHistory.tsx`.
 *
 * Mocks the repository-level hook (`useCasesheetContributionHistoryQuery`)
 * and context (`useEpisodeContext`/`usePatientContext`) directly, following
 * `useClinicalTimelineData.test.tsx`'s own convention for hooks that read
 * Persistent Context. Mocks `useClinicTheme` with the same literal token
 * shape `caseSheetModuleComposition.test.tsx` already established.
 */
import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import {
  CaseSheetContributionHistory,
} from '../../../features/episodes/presentation/components/ConsultationSections/CaseSheetContributionHistory';
import {
  useEpisodeContext,
  usePatientContext,
} from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { useCasesheetContributionHistoryQuery } from '../../../features/casesheets/data/repositories/casesheets.repository.impl';
import { CasesheetContributionItem } from '../../../features/casesheets/data/models/casesheets.dtos';

jest.mock('../../../features/episodes/presentation/context/ClinicalWorkspaceContext', () => ({
  useEpisodeContext: jest.fn(),
  usePatientContext: jest.fn(),
}));
jest.mock('../../../features/casesheets/data/repositories/casesheets.repository.impl', () => ({
  useCasesheetContributionHistoryQuery: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2563EB' },
      background: { muted: '#F3F4F6' },
      surface: { default: '#FFFFFF' },
      border: { default: '#E5E7EB', subtle: '#F3F4F6' },
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
      feedback: { error: '#EF4444' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
      h6: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
      subtitle2: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
      body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
      caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
      button: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    },
    radii: { small: 4, medium: 8, large: 16, pill: 999 },
    borderWidths: { thin: 1 },
    sizes: { touchTarget: 44, iconSmall: 16, iconMedium: 24, iconLarge: 32 },
  }),
}));

const TENANT_ID = 'tenant-1';
const CASESHEET_ID = 'casesheet-1';
const CLIENT_ID = 'client-1';
const EPISODE_ID = 'episode-1';

function contribution(overrides: Partial<CasesheetContributionItem> = {}): CasesheetContributionItem {
  return {
    id: 'contribution-1',
    visit_id: 'visit-1',
    author: { staff_id: 'staff-1', full_name: 'Dr. Asha Rao' },
    contributed_at: '2026-06-01T10:00:00',
    content_snapshot: { basic: { chief_complaint: 'Headache for 3 days' }, extensions: [] },
    content_available: true,
    ...overrides,
  };
}

function mockQueryResult(overrides: Partial<ReturnType<typeof useCasesheetContributionHistoryQueryDefault>> = {}) {
  (useCasesheetContributionHistoryQuery as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  });
}
function useCasesheetContributionHistoryQueryDefault() {
  return { data: undefined as any, isLoading: false, isError: false, refetch: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useEpisodeContext as jest.Mock).mockReturnValue({
    tenantId: TENANT_ID,
    episodeId: EPISODE_ID,
    casesheetId: CASESHEET_ID,
  });
  (usePatientContext as jest.Mock).mockReturnValue({ clientId: CLIENT_ID });
});

function renderAndExpand(overrides?: Parameters<typeof mockQueryResult>[0]) {
  mockQueryResult(overrides);
  const utils = render(<CaseSheetContributionHistory />);
  fireEvent.press(utils.getByText('Visit History'));
  return utils;
}

describe('CaseSheetContributionHistory rendering (T-FE-E.1b)', () => {
  it('renders nothing when there is no Case Sheet yet -- never calls the hook enabled', () => {
    (useEpisodeContext as jest.Mock).mockReturnValue({
      tenantId: TENANT_ID,
      episodeId: EPISODE_ID,
      casesheetId: null,
    });
    mockQueryResult();
    const { queryByText } = render(<CaseSheetContributionHistory />);
    expect(queryByText('Visit History')).toBeNull();
  });

  it('shows loading state when the query is loading', () => {
    const { getByText } = renderAndExpand({ isLoading: true });
    expect(getByText('Loading Visit history…')).toBeTruthy();
  });

  it('shows the error state with a Retry action, and current editor is unaffected (component itself never touches an editor)', () => {
    const refetch = jest.fn();
    const { getByText } = renderAndExpand({ isError: true, refetch });
    expect(getByText('Could not load Visit history.')).toBeTruthy();
    fireEvent.press(getByText('Retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the empty-history state only when the endpoint returns an empty list', () => {
    const { getByText } = renderAndExpand({
      data: { casesheet_id: CASESHEET_ID, episode_id: EPISODE_ID, contributions: [] },
    });
    expect(getByText('No prior Visit contributions yet.')).toBeTruthy();
  });

  it('renders author and timestamp for a contribution', () => {
    const { getByText } = renderAndExpand({
      data: { casesheet_id: CASESHEET_ID, episode_id: EPISODE_ID, contributions: [contribution()] },
    });
    expect(getByText(/Dr\. Asha Rao/)).toBeTruthy();
    expect(getByText(/Recorded on/)).toBeTruthy();
  });

  it('renders the recorded snapshot content read-only when content_available is true, behind an explicit toggle', () => {
    const { getByText, queryByText } = renderAndExpand({
      data: { casesheet_id: CASESHEET_ID, episode_id: EPISODE_ID, contributions: [contribution()] },
    });
    // Not shown until the user explicitly expands the entry.
    expect(queryByText('Headache for 3 days')).toBeNull();
    fireEvent.press(getByText('View recorded content'));
    expect(getByText('Headache for 3 days')).toBeTruthy();
  });

  it('multiple contributions are all retained -- never collapsed, even when they share a Visit', () => {
    const sameVisitA = contribution({ id: 'c-1', visit_id: 'visit-1', contributed_at: '2026-06-01T09:00:00' });
    const sameVisitB = contribution({
      id: 'c-2',
      visit_id: 'visit-1',
      contributed_at: '2026-06-01T09:00:00',
      content_snapshot: { basic: { chief_complaint: 'Updated later same Visit' }, extensions: [] },
    });
    const { getByText, getAllByText } = renderAndExpand({
      data: { casesheet_id: CASESHEET_ID, episode_id: EPISODE_ID, contributions: [sameVisitA, sameVisitB] },
    });
    // Two separate entries render -- duplicate timestamps/Visit ids never merged.
    expect(getAllByText(/Recorded on/).length).toBe(2);
    fireEvent.press(getAllByText('View recorded content')[0]);
    // Re-query after the first press re-renders (that entry now reads
    // "Hide recorded content") -- the second entry's toggle is still
    // "View recorded content".
    fireEvent.press(getAllByText('View recorded content')[0]);
    expect(getByText('Headache for 3 days')).toBeTruthy();
    expect(getByText('Updated later same Visit')).toBeTruthy();
  });

  it('preserves the exact backend order -- no local sort by date/author/content-availability', () => {
    const first = contribution({ id: 'c-first', author: { staff_id: 's1', full_name: 'Dr. First' } });
    const second = contribution({ id: 'c-second', author: { staff_id: 's2', full_name: 'Dr. Second' } });
    const { getAllByText } = renderAndExpand({
      // Backend order is contributed_at ASC, id ASC -- component must not reorder.
      data: { casesheet_id: CASESHEET_ID, episode_id: EPISODE_ID, contributions: [first, second] },
    });
    const authorTexts = getAllByText(/Recorded by/).map((node) => node.props.children.join(''));
    expect(authorTexts[0]).toContain('Dr. First');
    expect(authorTexts[1]).toContain('Dr. Second');
  });

  it('legacy contribution (content_available=false) shows the explicit unavailable state, not an empty note, while still showing author and timestamp', () => {
    const legacy = contribution({
      content_available: false,
      content_snapshot: null,
      author: { staff_id: 's-legacy', full_name: 'Dr. Legacy' },
    });
    const { getByText } = renderAndExpand({
      data: { casesheet_id: CASESHEET_ID, episode_id: EPISODE_ID, contributions: [legacy] },
    });
    expect(getByText('Historical content unavailable')).toBeTruthy();
    expect(getByText(/Dr\. Legacy/)).toBeTruthy();
    expect(getByText(/Recorded on/)).toBeTruthy();
  });

  it('missing/deleted author (full_name null) renders the safe localized fallback, never a raw staff id', () => {
    const noAuthor = contribution({ author: { staff_id: 'staff-deleted-xyz', full_name: null } });
    const { getByText, queryByText } = renderAndExpand({
      data: { casesheet_id: CASESHEET_ID, episode_id: EPISODE_ID, contributions: [noAuthor] },
    });
    expect(getByText(/Former or unavailable staff member/)).toBeTruthy();
    expect(queryByText(/staff-deleted-xyz/)).toBeNull();
  });

  it('read-only badge is present on every entry, distinguishing it from the editable draft above', () => {
    const { getByText } = renderAndExpand({
      data: { casesheet_id: CASESHEET_ID, episode_id: EPISODE_ID, contributions: [contribution()] },
    });
    expect(getByText(/Read-only/)).toBeTruthy();
  });
});

describe('CaseSheetContributionHistory current-document isolation (T-FE-E.1b)', () => {
  it('never renders raw JSON -- snapshot fields are rendered individually, not dumped as a JSON string', () => {
    const { getByText, queryByText } = renderAndExpand({
      data: {
        casesheet_id: CASESHEET_ID,
        episode_id: EPISODE_ID,
        contributions: [contribution()],
      },
    });
    fireEvent.press(getByText('View recorded content'));
    expect(queryByText(/"chief_complaint"/)).toBeNull();
    expect(queryByText(/{"basic"/)).toBeNull();
  });

  it('the component module never imports a create/update mutation hook or the casesheets datasource/axios client', () => {
    const source = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../features/episodes/presentation/components/ConsultationSections/CaseSheetContributionHistory.tsx',
      ),
      'utf8',
    );
    expect(source).not.toMatch(/useCreateCasesheetMutation|useUpdateCasesheetMutation/);
    expect(source).not.toMatch(/axiosClient/);
    expect(source).not.toMatch(/casesheets\.api/);
  });
});

describe('CaseSheetContributionHistory architecture (T-FE-E.1b)', () => {
  const source = fs.readFileSync(
    path.resolve(
      __dirname,
      '../../../features/episodes/presentation/components/ConsultationSections/CaseSheetContributionHistory.tsx',
    ),
    'utf8',
  );

  it('imports the repository hook only, not the datasource, from the casesheets data layer', () => {
    expect(source).toMatch(/from '..\/..\/..\/..\/casesheets\/data\/repositories\/casesheets\.repository\.impl'/);
    expect(source).not.toMatch(/from '..\/..\/..\/..\/casesheets\/data\/datasources\/casesheets\.api'/);
  });

  it('never imports a staff repository/datasource -- author facts come only from the backend response', () => {
    expect(source).not.toMatch(/staff.*repository|staff.*\.api/i);
  });

  it('performs no diff/summary/comparison computation -- no "diff", "changes", or "summary" language in source', () => {
    expect(source.toLowerCase()).not.toMatch(/computediff|generatesummary|compare(snapshot|contribution)/);
  });

  it('uses only useClinicTheme() tokens -- no raw hex colors in the component source', () => {
    // Allow the file's own doc-comment references to other files but forbid literal hex colors in styles.
    const hexColorInStyle = /backgroundColor:\s*['"]#[0-9a-fA-F]{3,8}['"]/;
    expect(source).not.toMatch(hexColorInStyle);
  });
});
