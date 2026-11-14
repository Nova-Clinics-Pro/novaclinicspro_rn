/**
 * Turns a failed API call into something the UI can explain.
 *
 * Screens used to print the transport message ("Request failed with status code 403") next to a
 * Retry button. A permission or plan problem is not retryable and the user needs to be told what
 * is wrong and who can do the thing, so failures are classified here and rendered by
 * `ApiErrorState` using localized text.
 */
export type ApiErrorKind =
  | 'permission_denied'
  | 'entitlement_required'
  | 'unauthenticated'
  | 'not_found'
  | 'network'
  | 'server'
  | 'unknown';

export interface ApiErrorInfo {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  /** Permission code the backend says is required, e.g. `appointment.create`. */
  readonly requiredPermission?: string;
  /** Role names (as stored by the backend) that normally hold the permission. */
  readonly permittedRoles: readonly string[];
  /** The signed-in user's own role names in this clinic, as reported by the backend with the denial. */
  readonly userRoles: readonly string[];
  /** Whether trying the same request again can reasonably succeed. */
  readonly retryable: boolean;
}

type Detail = {
  error_code?: unknown;
  details?: { required_permission?: unknown; permitted_roles?: unknown; user_roles?: unknown } | null;
};

const asDetail = (data: unknown): Detail | null => {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  for (const candidate of [record.detail, record.error]) {
    if (candidate && typeof candidate === 'object') return candidate as Detail;
  }
  return null;
};

const stringList = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];

export const classifyApiError = (error: unknown): ApiErrorInfo => {
  const response = (error as { response?: { status?: unknown; data?: unknown } } | undefined)?.response;
  const status = typeof response?.status === 'number' ? response.status : undefined;
  const detail = asDetail(response?.data);
  const code = typeof detail?.error_code === 'string' ? detail.error_code : undefined;
  const requiredPermission =
    typeof detail?.details?.required_permission === 'string' ? detail.details.required_permission : undefined;
  const permittedRoles = stringList(detail?.details?.permitted_roles);
  const userRoles = stringList(detail?.details?.user_roles);

  if (status === 403 && code === 'COMMERCIAL_ENTITLEMENT_REQUIRED') {
    return { kind: 'entitlement_required', status, requiredPermission, permittedRoles, userRoles, retryable: false };
  }
  if (status === 403) {
    // Any 403 is a refusal of this user, whether or not the backend named the permission.
    return { kind: 'permission_denied', status, requiredPermission, permittedRoles, userRoles, retryable: false };
  }
  if (status === 401) return { kind: 'unauthenticated', status, permittedRoles: [], userRoles: [], retryable: false };
  if (status === 404) return { kind: 'not_found', status, permittedRoles: [], userRoles: [], retryable: false };
  if (status !== undefined && status >= 500) return { kind: 'server', status, permittedRoles: [], userRoles: [], retryable: true };
  if (status === undefined) return { kind: 'network', permittedRoles: [], userRoles: [], retryable: true };
  return { kind: 'unknown', status, permittedRoles: [], userRoles: [], retryable: false };
};
