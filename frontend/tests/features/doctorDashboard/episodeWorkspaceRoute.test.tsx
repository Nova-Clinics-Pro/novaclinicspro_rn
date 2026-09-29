import { render } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFeatures } from '../../../core/hooks/useFeatures';
import EpisodeWorkspaceRoute from '../../../app/clinic-admin/episodes/[episodeId]/workspace';

jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn() }));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: jest.fn(),
  isCosV1Enabled: (features: { cos_v1_enabled?: boolean }) => Boolean(features.cos_v1_enabled),
}));
jest.mock('../../../features/episodes/presentation/pages/EpisodeWorkspaceScreen', () => ({
  EpisodeWorkspaceScreen: (props: { mode: string; episodeId: string; clientId: string }) =>
    require('react').createElement(
      require('react-native').Text,
      { testID: 'legacy-workspace' },
      `${props.mode}:${props.episodeId}:${props.clientId}`,
    ),
}));
jest.mock('../../../features/episodes/presentation/pages/VisitCommandCenter', () => ({
  VisitCommandCenter: (props: { episodeId: string; appointmentId?: string; clientId: string }) =>
    require('react').createElement(
      require('react-native').Text,
      { testID: 'visit-command-center' },
      `${props.episodeId}:${props.appointmentId ?? 'missing'}:${props.clientId}`,
    ),
}));

describe('Episode Workspace COS route handoff', () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      episodeId: 'episode-1',
      appointmentId: 'appointment-1',
      clientId: 'client-1',
      mode: 'doctor',
    });
  });

  it('passes explicit appointment context to VisitCommandCenter when cos_v1 is enabled', () => {
    (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: true });

    const { getByTestId, queryByTestId } = render(<EpisodeWorkspaceRoute />);

    expect(getByTestId('visit-command-center').props.children).toBe('episode-1:appointment-1:client-1');
    expect(queryByTestId('legacy-workspace')).toBeNull();
  });

  it('preserves the legacy workspace when cos_v1 is disabled', () => {
    (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: false });

    const { getByTestId, queryByTestId } = render(<EpisodeWorkspaceRoute />);

    expect(getByTestId('legacy-workspace').props.children).toBe('doctor:episode-1:client-1');
    expect(queryByTestId('visit-command-center')).toBeNull();
  });

  it('does not invent appointment context when a malformed deep link omits appointmentId', () => {
    (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: true });
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      episodeId: 'episode-1',
      clientId: 'client-1',
    });

    const { getByTestId } = render(<EpisodeWorkspaceRoute />);

    expect(getByTestId('visit-command-center').props.children).toBe('episode-1:missing:client-1');
  });
});
