import type { ApiErrorInfo } from '../api/apiErrorPresentation';

type Translate = (key: string, params?: Record<string, string | number>) => string;

const normalizeRole = (role: string): string => role.trim().toLowerCase().replace(/[\s-]+/g, '_');

const translateIfPresent = (t: Translate, key: string): string | null => {
  const value = t(key);
  return value && value !== key ? value : null;
};

const joinList = (t: Translate, items: readonly string[]): string => {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return t('errors.permissionDenied.listTwo', { a: items[0], b: items[1] });
  return t('errors.permissionDenied.listMany', {
    head: items.slice(0, -1).join(', '),
    last: items[items.length - 1],
  });
};

/** "view appointments", "create prescriptions" ... built from the permission code, in the user's language. */
export const describePermissionAction = (t: Translate, permissionCode?: string): string => {
  const fallback = t('errors.permissionDenied.genericAction');
  if (!permissionCode) return fallback;
  const dot = permissionCode.lastIndexOf('.');
  if (dot <= 0) return fallback;
  const objectKey = permissionCode.slice(0, dot).replace(/\./g, '_');
  const verbKey = permissionCode.slice(dot + 1);
  const object = translateIfPresent(t, `errors.permissionDenied.objects.${objectKey}`);
  const verb = translateIfPresent(t, `errors.permissionDenied.verbs.${verbKey}`);
  if (!object || !verb) return fallback;
  return t('errors.permissionDenied.actionTemplate', { verb, object });
};

const roleLabels = (t: Translate, group: 'rolesAs' | 'rolesPlural', roles: readonly string[]): string[] =>
  roles.map(role => translateIfPresent(t, `errors.permissionDenied.${group}.${normalizeRole(role)}`) ?? role);

export interface ApiErrorMessage {
  readonly title: string;
  readonly message: string;
}

/**
 * The localized title and message for an API failure.
 *
 * `userRoles` are the signed-in user's role codes (e.g. `clinic_owner`); the first one that has a label is
 * named in the sentence. Messages never include the transport text ("Request failed with status code ...").
 */
export const describeApiError = (
  t: Translate,
  info: ApiErrorInfo,
  userRoles: readonly string[] = [],
): ApiErrorMessage => {
  const action = describePermissionAction(t, info.requiredPermission);

  if (info.kind === 'entitlement_required') {
    return {
      title: t('errors.entitlementRequired.title'),
      message: t('errors.entitlementRequired.message', { action }),
    };
  }

  if (info.kind === 'permission_denied') {
    // The backend names the user's roles in this clinic; the session's own role list is the fallback.
    const candidates = (info.userRoles.length > 0 ? info.userRoles : userRoles).filter(role => role.trim().length > 0);
    const myRole = roleLabels(t, 'rolesAs', candidates).find((label, index) => label !== candidates[index]);
    const permitted = joinList(t, roleLabels(t, 'rolesPlural', info.permittedRoles));
    let key: string;
    if (info.permittedRoles.length > 0) key = myRole ? 'withRoles' : 'withRolesNoMine';
    else key = myRole ? 'noRoles' : 'noRolesNoMine';
    return {
      title: t('errors.permissionDenied.title'),
      message: t(`errors.permissionDenied.${key}`, { myRole: myRole ?? '', action, roles: permitted }),
    };
  }

  const messageKey: Record<string, string> = {
    network: 'errors.apiState.network',
    server: 'errors.apiState.server',
    not_found: 'errors.apiState.notFound',
    unauthenticated: 'errors.apiState.unauthenticated',
  };
  return {
    title: t('errors.apiState.loadFailedTitle'),
    message: t(messageKey[info.kind] ?? 'errors.apiState.unknown'),
  };
};
