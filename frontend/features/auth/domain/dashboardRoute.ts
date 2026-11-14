import { roleCode } from './roleLabels';

export type DashboardRoute = '/clinic-admin' | '/doctor' | '/therapist';

const CLINIC_ADMIN_ROLES = new Set(['clinic_owner', 'clinic_admin', 'receptionist', 'tenant_admin']);

/**
 * THE one place that decides which dashboards a clinic user may open, from ALL their roles. Every dashboard guard, the
 * home route and the post-login redirect must use this: each of them used to carry its own list of role names (and look at
 * `roles[0]` only), the lists disagreed, and a user the lists did not know was redirected between two screens forever.
 *
 * Ordered by priority (owner/admin/front-desk, then doctor, then therapist), so the first entry is where the user lands and
 * a user with two roles can still open either dashboard.
 *
 * An empty list means the user has roles but none of them has a dashboard (for example "Staff", "Nurse", "Pharmacist"):
 * callers must explain that and must NOT redirect anywhere. A user with no roles at all keeps the old default, the
 * clinic-admin dashboard (a freshly registered owner's token can carry no roles).
 */
export const dashboardsFor = (roles: readonly string[] | null | undefined): DashboardRoute[] => {
  const codes = (roles ?? []).map(roleCode).filter(Boolean);
  if (codes.length === 0) return ['/clinic-admin'];
  const dashboards: DashboardRoute[] = [];
  if (codes.some(code => CLINIC_ADMIN_ROLES.has(code))) dashboards.push('/clinic-admin');
  if (codes.includes('doctor')) dashboards.push('/doctor');
  if (codes.includes('therapist')) dashboards.push('/therapist');
  return dashboards;
};

/** Where the user lands: their highest-priority dashboard, or null when their roles have none. */
export const resolveDashboardRoute = (roles: readonly string[] | null | undefined): DashboardRoute | null =>
  dashboardsFor(roles)[0] ?? null;

/** Whether the user may open `route`'s dashboard. */
export const mayOpenDashboard = (roles: readonly string[] | null | undefined, route: DashboardRoute): boolean =>
  dashboardsFor(roles).includes(route);
