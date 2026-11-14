/**
 * Which episode actions to offer on an appointment, from the user's effective permissions.
 *
 * The backend is authoritative: creating an episode requires `episode.create`, and attaching an appointment to an
 * episode requires `appointment.update`. Offering the buttons from a list of role NAMES hid them from the Clinic Owner
 * (whose role name was not in the list) and from roles the backend allows (e.g. Receptionist can create episodes).
 */
export interface EpisodeActionAccess {
  canCreateEpisode: boolean;
  canLinkEpisode: boolean;
}

export const episodeActionAccess = (permissions: readonly string[] | null | undefined): EpisodeActionAccess => {
  const granted = new Set(permissions ?? []);
  return {
    canCreateEpisode: granted.has('episode.create'),
    canLinkEpisode: granted.has('appointment.update'),
  };
};
