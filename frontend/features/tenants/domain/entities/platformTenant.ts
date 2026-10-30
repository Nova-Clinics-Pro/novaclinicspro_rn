/** Administrative projection only: organization association is not clinic identity. */
export interface PlatformTenant {
  id: string;
  code: string;
  name: string;
  clinic_type: string;
  status: string;
  is_active: boolean;
  created_at: string;
  organization_id: string | null;
}
export interface PlatformTenantPage {
  items: PlatformTenant[];
  total: number;
  active_total: number;
  offset: number;
  limit: number;
}
