/**
 * Which episode actions to offer on an appointment, from the user's effective permissions.
 *
 * The backend is authoritative: opening an episode (a clinical case) and attaching or changing an appointment's episode
 * both require `episode.create`, which only the Doctor role holds. Offering the buttons from a list of role NAMES showed
 * them to (or hid them from) the wrong roles; a union with the sign-in token's legacy permissions did the same.
 */
export interface EpisodeActionAccess {
  canCreateEpisode: boolean;
  canLinkEpisode: boolean;
}

export const episodeActionAccess = (permissions: readonly string[] | null | undefined): EpisodeActionAccess => {
  const granted = new Set(permissions ?? []);
  return {
    canCreateEpisode: granted.has('episode.create'),
    canLinkEpisode: granted.has('episode.create'),
  };
};
