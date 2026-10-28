import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useEpisodeQuery, useEpisodeDetailsQuery, useCloseEpisodeMutation,
  useReopenEpisodeMutation, useUpdateEpisodeMutation } from '../../../features/episodes/data/repositories/episodes.repository.impl';
import { useAppointmentsListQuery } from '../../../features/appointments/data/repositories/appointments.repository.impl';
import * as episodeDtos from '../../../features/episodes/data/models/episodes.dtos';
import { EpisodeDetailScreen } from '../../../features/episodes/presentation/pages/EpisodeDetailScreen';
import { EpisodeDetailMetadataGrid } from '../../../features/episodes/presentation/components/EpisodeDetailMetadataGrid';
import { ThemeProvider } from '../../../core/theme/useClinicTheme';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
jest.mock('../../../features/episodes/data/repositories/episodes.repository.impl', () => ({
  useEpisodeQuery: jest.fn(), useEpisodeDetailsQuery: jest.fn(), useCloseEpisodeMutation: jest.fn(),
  useReopenEpisodeMutation: jest.fn(), useUpdateEpisodeMutation: jest.fn(),
}));
jest.mock('../../../features/appointments/data/repositories/appointments.repository.impl', () => ({ useAppointmentsListQuery: jest.fn() }));
jest.mock('../../../features/episodes/presentation/components/EpisodeStatusBadge', () => ({ EpisodeStatusBadge: () => null }));
jest.mock('../../../features/episodes/presentation/components/EpisodeFormModal', () => ({ EpisodeFormModal: () => null }));
jest.mock('../../../features/episodes/presentation/components/TreatmentPlansSection', () => ({ TreatmentPlansSection: () => null }));
jest.mock('../../../features/episodes/presentation/components/TreatmentSheetsSection', () => ({ TreatmentSheetsSection: () => null }));

const episode = { id: 'episode-a', title: 'Episode A', status: 'ACTIVE', start_date: '2026-10-01',
  end_date: null, last_visit_date: '', visits_count: 0 };
const mutation = { mutateAsync: jest.fn(), isPending: false };
const query = (data: unknown) => ({ data, isLoading: false, error: null, refetch: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks();
  (useEpisodeQuery as jest.Mock).mockReturnValue(query(episode));
  (useEpisodeDetailsQuery as jest.Mock).mockReturnValue(query({ documents: { casesheet: { exists: true, id: 'sheet-a' } }, visits: [] }));
  (useAppointmentsListQuery as jest.Mock).mockReturnValue(query({ items: [] }));
  for (const hook of [useCloseEpisodeMutation, useReopenEpisodeMutation, useUpdateEpisodeMutation]) {
    (hook as jest.Mock).mockReturnValue(mutation);
  }
  jest.spyOn(episodeDtos, 'formatEpisodeDate').mockImplementation((value) => `display:${value}`);
});
afterEach(() => jest.restoreAllMocks());

it('keeps formatting, tenant-scoped queries and existing navigation in the screen', () => {
  const onBack = jest.fn();
  const onCasesheet = jest.fn();
  const view = render(<ThemeProvider><EpisodeDetailScreen tenantId="tenant-a" episodeId="episode-a"
    onBack={onBack} onNavigateToCasesheet={onCasesheet} /></ThemeProvider>);
  expect(useEpisodeQuery).toHaveBeenCalledWith('tenant-a', 'episode-a');
  expect(useEpisodeDetailsQuery).toHaveBeenCalledWith('tenant-a', 'episode-a');
  expect(useAppointmentsListQuery).toHaveBeenCalledWith('tenant-a', { episode_id: 'episode-a', skip: 0, limit: 50 }, { enabled: true });
  expect(episodeDtos.formatEpisodeDate).toHaveBeenCalledTimes(1);
  expect(episodeDtos.formatEpisodeDate).toHaveBeenCalledWith(episode.start_date);
  const metadata = view.UNSAFE_getByType(EpisodeDetailMetadataGrid);
  expect(metadata.props).toEqual(expect.objectContaining({ startDateText: 'display:2026-10-01',
    showEndDate: false, showLastVisit: false, endDateText: undefined, lastVisitDateText: undefined, visitsCount: 0 }));
  expect(view.getByText('display:2026-10-01')).toBeTruthy();
  expect(view.queryByText('End Date')).toBeNull();
  expect(view.queryByText('Last Visit')).toBeNull();
  // Native icon's containing touchable preserves the existing back callback.
  const backIcon = view.UNSAFE_getAllByType(Ionicons)
    .find((node) => node.props.name === 'arrow-back');
  expect(backIcon).toBeTruthy();
  fireEvent.press(backIcon!);
  expect(onBack).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getByText('View Casesheet'));
  expect(onCasesheet).toHaveBeenCalledWith('sheet-a');
  expect(mutation.mutateAsync).not.toHaveBeenCalled();
});

it('passes newly formatted optional dates after query data changes without changing lifecycle ownership', () => {
  const view = render(<ThemeProvider><EpisodeDetailScreen tenantId="tenant-a" episodeId="episode-a" /></ThemeProvider>);
  (useEpisodeQuery as jest.Mock).mockReturnValue(query({ ...episode, end_date: '2026-10-08', last_visit_date: '2026-10-07', visits_count: 4 }));
  view.rerender(<ThemeProvider><EpisodeDetailScreen tenantId="tenant-a" episodeId="episode-a" /></ThemeProvider>);
  expect(view.getByText('display:2026-10-08')).toBeTruthy();
  expect(view.getByText('display:2026-10-07')).toBeTruthy();
  expect(view.UNSAFE_getByType(EpisodeDetailMetadataGrid).props).toEqual(expect.objectContaining({
    showEndDate: true, showLastVisit: true, visitsCount: 4,
  }));
  expect(view.getByText('Close Episode')).toBeTruthy();
  expect(view.queryByText('Reopen Episode')).toBeNull();
  expect(mutation.mutateAsync).not.toHaveBeenCalled();
});
