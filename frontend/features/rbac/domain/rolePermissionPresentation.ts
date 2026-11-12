import { describePermissionAction } from '../../../core/localization/apiErrorMessages';
import type { RolePermissionItemDto } from '../data/models/rolePermissions.dtos';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export type RolePermissionBadge = 'added' | 'removed' | null;

export interface RolePermissionRow {
  readonly code: string;
  /** Localized, human label ("Create appointments"). */
  readonly label: string;
  readonly effective: boolean;
  readonly locked: boolean;
  readonly badge: RolePermissionBadge;
}

export interface RolePermissionGroup {
  readonly module: string;
  /** Localized heading for the group. */
  readonly title: string;
  readonly rows: readonly RolePermissionRow[];
}

const capitalize = (text: string): string => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/** Group key: the permission's module, folded so CORE / core and staff / STAFF_MANAGEMENT-style variants stay apart but stable. */
const moduleKey = (item: RolePermissionItemDto): string => (item.module ?? 'other').toLowerCase();

const prettify = (key: string): string => capitalize(key.replace(/[_.]+/g, ' '));

/** "Create appointments" in the user's language; falls back to the backend's English name for codes we have no phrase for. */
export const permissionLabel = (t: Translate, item: Pick<RolePermissionItemDto, 'code' | 'name'>): string => {
  const generic = t('errors.permissionDenied.genericAction');
  const phrase = describePermissionAction(t, item.code);
  return phrase === generic ? item.name : capitalize(phrase);
};

export const badgeFor = (item: Pick<RolePermissionItemDto, 'default_granted' | 'override'>): RolePermissionBadge => {
  if (item.override === 'ADD' && !item.default_granted) return 'added';
  if (item.override === 'REMOVE' && item.default_granted) return 'removed';
  return null;
};

export const groupRolePermissions = (t: Translate, items: readonly RolePermissionItemDto[]): RolePermissionGroup[] => {
  const byModule = new Map<string, RolePermissionRow[]>();
  for (const item of items) {
    const key = moduleKey(item);
    const rows = byModule.get(key) ?? [];
    rows.push({
      code: item.code,
      label: permissionLabel(t, item),
      effective: item.effective,
      locked: item.locked,
      badge: badgeFor(item),
    });
    byModule.set(key, rows);
  }
  return [...byModule.entries()]
    .map(([key, rows]) => {
      const translated = t(`rolePermissions.modules.${key}`);
      return {
        module: key,
        title: translated !== `rolePermissions.modules.${key}` ? translated : prettify(key),
        rows: [...rows].sort((a, b) => a.label.localeCompare(b.label)),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
};

/** Number of permissions this clinic has customized on the role (shown next to "Reset to defaults"). */
export const customizationCount = (items: readonly RolePermissionItemDto[]): number =>
  items.filter(item => badgeFor(item) !== null).length;
