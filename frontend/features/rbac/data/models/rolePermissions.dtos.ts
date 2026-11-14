/** DTOs for customizing a role's permissions in one clinic (owner only). */

export type RolePermissionOverride = 'ADD' | 'REMOVE' | null;

export interface RolePermissionItemDto {
  code: string;
  name: string;
  description?: string | null;
  module?: string | null;
  /** Whether the platform default for the role includes the permission. */
  default_granted: boolean;
  /** This clinic's customization; null means the role follows the default. */
  override: RolePermissionOverride;
  /** Whether the role holds the permission in this clinic. */
  effective: boolean;
  /** Whether it cannot be changed on this role. */
  locked: boolean;
}

export interface RolePermissionsDto {
  role_id: string;
  role_name: string;
  is_system: boolean;
  items: RolePermissionItemDto[];
}

export interface ResetRolePermissionsDto {
  overrides_removed: number;
}
