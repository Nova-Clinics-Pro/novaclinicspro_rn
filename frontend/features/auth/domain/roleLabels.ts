type Translate = (key: string, params?: Record<string, string | number>) => string;

/** "Clinic Owner" / "clinic_owner" -> "clinic_owner". */
export const roleCode = (role: string): string => role.trim().toLowerCase().replace(/[\s-]+/g, '_');

const prettify = (role: string): string =>
  role.trim().replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

/** A role in the user's language ("Clinic Owner", "क्लिनिक स्वामी"); unknown roles keep a readable form of their own name. */
export const roleLabel = (t: Translate, role: string): string => {
  const key = `roles.names.${roleCode(role)}`;
  const translated = t(key);
  return translated !== key ? translated : prettify(role);
};

/**
 * The roles to show for a user, as human-readable labels: the names the backend reports for the current clinic,
 * falling back to the session's role codes; duplicates (same role from both sources) collapse.
 */
export const roleLabelsFor = (
  t: Translate,
  session: { roles: readonly string[]; roleNames?: readonly string[] }
): string[] => {
  const source = session.roleNames && session.roleNames.length > 0 ? session.roleNames : session.roles;
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const role of source) {
    const code = roleCode(role);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    labels.push(roleLabel(t, role));
  }
  return labels;
};
