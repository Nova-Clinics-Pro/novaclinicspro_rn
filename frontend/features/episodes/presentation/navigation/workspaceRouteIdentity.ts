/**
 * Identity of a consultation workspace route instance, used as the `dangerouslySingular` id of the
 * `episodes/[episodeId]/workspace` and `episodes/[episodeId]/consultation` screens.
 *
 * routeName + episodeId + appointmentId. Tenant is deliberately NOT part of the identity (decision D7, option B):
 * episode and appointment ids are UUIDs, so they already cannot collide across clinics, and switching clinic resets
 * the navigation stack (see app/owner/index.tsx).
 *
 * Repeated navigation to the same appointment reuses its existing workspace instance (and its draft); a different
 * appointment gets its own instance. Without an appointmentId there is no identity (undefined => default behavior).
 */

const single = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) return value[0];
  return undefined;
};

export const workspaceRouteIdentity = (routeName: string, params: Record<string, unknown> | undefined): string | undefined => {
  const appointmentId = single(params?.appointmentId);
  if (!appointmentId) return undefined;
  const episodeId = single(params?.episodeId) ?? '';
  return `${routeName}|${episodeId}|${appointmentId}`;
};
