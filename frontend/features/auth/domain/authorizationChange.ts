import type { AuthUserSession } from './entities/auth.entity';

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

/**
 * Whether a fresh /auth/me answer for the SAME signed-in user and clinic carries different authorization (roles,
 * role names or permissions) than the session holds. Only authorization is compared: identity, clinic and every other
 * field of the session stay as they are, so refreshing authorization can never switch who or where the user is.
 */
export const authorizationChanged = (
  current: Pick<AuthUserSession, 'roles' | 'roleNames' | 'permissions'>,
  fresh: Pick<AuthUserSession, 'roles' | 'roleNames' | 'permissions'>
): boolean =>
  !sameSet(current.roles, fresh.roles) ||
  !sameSet(current.roleNames ?? [], fresh.roleNames ?? []) ||
  !sameSet(current.permissions, fresh.permissions);

/** Same person, same clinic: the only case in which a refresh may replace the session's authorization. */
export const isSameScope = (
  current: Pick<AuthUserSession, 'userId' | 'tenantId'>,
  fresh: Pick<AuthUserSession, 'userId' | 'tenantId'>
): boolean => current.userId === fresh.userId && current.tenantId === fresh.tenantId;
