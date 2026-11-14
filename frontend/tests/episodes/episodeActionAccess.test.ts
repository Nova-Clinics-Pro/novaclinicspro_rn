import { episodeActionAccess } from '../../features/episodes/domain/episodeActionAccess';

describe('episodeActionAccess', () => {
  it('offers create when the backend grants episode.create, whatever the role is called', () => {
    expect(episodeActionAccess(['episode.create', 'episode.read'])).toEqual({ canCreateEpisode: true, canLinkEpisode: false });
  });

  it('offers attach/change when the backend grants appointment.update', () => {
    expect(episodeActionAccess(['appointment.update'])).toEqual({ canCreateEpisode: false, canLinkEpisode: true });
  });

  it('a clinic owner (all episode permissions) gets both', () => {
    expect(episodeActionAccess(['appointment.update', 'episode.create', 'episode.update', 'episode.read'])).toEqual({
      canCreateEpisode: true,
      canLinkEpisode: true,
    });
  });

  it('offers nothing to a role without those permissions, or before permissions are known', () => {
    const none = { canCreateEpisode: false, canLinkEpisode: false };
    expect(episodeActionAccess(['episode.read'])).toEqual(none);
    expect(episodeActionAccess([])).toEqual(none);
    expect(episodeActionAccess(undefined)).toEqual(none);
  });
});
