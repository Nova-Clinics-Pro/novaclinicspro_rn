/**
 * Print palette. A printed page is ink on white paper, so these are fixed neutrals that stay readable on any printer; only the
 * accent (headings, table header) follows the clinic theme. Kept here, with the other theme sources, so no screen or print builder
 * carries a colour of its own.
 */
export const printPalette = {
  paper: '#ffffff',
  ink: '#1f2937',
  headingInk: '#111827',
  labelInk: '#4b5563',
  mutedInk: '#6b7280',
  rule: '#e5e7eb',
  ruleStrong: '#d1d5db',
  panel: '#f8fafc',
  onAccent: '#ffffff',
  /** Used when the caller gives no accent. */
  defaultAccent: '#1d4ed8',
};
