export const platformTenantRoutes = {
  dashboard: '/super-admin' as const,
  tenants: '/super-admin/tenants' as const,
  detail: (id: string) => `/super-admin/tenants/${encodeURIComponent(id)}` as const,
};
