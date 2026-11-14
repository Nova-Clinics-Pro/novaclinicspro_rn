import { episodeActionAccess } from '../../features/episodes/domain/episodeActionAccess';

describe('episodeActionAccess', () => {
  it('offers create when the backend grants episode.create, whatever the role is called', () => {
    expect(episodeActionAccess(['episode.create', 'episode.read']).canCreateEpisode).toBe(true);
    expect(episodeActionAccess(['episode.read', 'episode.update']).canCreateEpisode).toBe(false);
  });

  it('attach/change follows episode.create too (Doctor only); appointment.update alone is not enough', () => {
    expect(episodeActionAccess(['episode.create'])).toEqual({ canCreateEpisode: true, canLinkEpisode: true });
    expect(episodeActionAccess(['appointment.update', 'episode.read', 'episode.update'])).toEqual({
      canCreateEpisode: false,
      canLinkEpisode: false,
    });
  });

  it('a doctor (holds episode.create) gets both', () => {
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
