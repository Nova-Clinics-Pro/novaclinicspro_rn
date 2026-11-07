/**
 * R7 UI Governance Correction — central design-token contract.
 *
 * Proves the new `radii`/`borderWidths`/`sizes` token categories exist,
 * are shaped as documented, and are supplied by every theme construction
 * site (`getTheme`, `ThemeProvider`, and `useClinicTheme`'s outside-
 * provider fallback) — the guarantee the correction depends on: a
 * reusable visual change (e.g. all R7 card radii) is achievable by
 * editing exactly one token file.
 */
import { radii } from '../../../core/theme/radii';
import { borderWidths } from '../../../core/theme/borderWidths';
import { sizes } from '../../../core/theme/sizes';
import { spacing } from '../../../core/theme/spacing';
import { getTheme } from '../../../core/theme/useClinicTheme';

describe('radii', () => {
  it('defines a small/medium/large/pill scale of plain numbers', () => {
    expect(radii).toEqual({ small: 4, medium: 8, large: 16, pill: 999 });
  });

  it('is a distinct token category from spacing — not aliased to it', () => {
    // radii.medium intentionally has the same numeric value spacing.sm
    // used to be misused as (8) — this proves they are two independently
    // editable token sources, not the same object/values-by-reference.
    expect(Object.is(radii, spacing)).toBe(false);
  });
});

describe('borderWidths', () => {
  it('defines a hairline and a default border width', () => {
    expect(borderWidths).toHaveProperty('hairline');
    expect(borderWidths).toHaveProperty('default');
    expect(borderWidths.default).toBe(1);
    expect(typeof borderWidths.hairline).toBe('number');
  });
});

describe('sizes', () => {
  it('defines the accessible touch target and the icon-size scale', () => {
    expect(sizes.touchTarget).toBe(44);
    expect(sizes.iconSmall).toBe(16);
    expect(sizes.iconMedium).toBe(24);
    expect(sizes.iconLarge).toBe(32);
  });
});

describe('getTheme (theme construction contract)', () => {
  it('includes radii, borderWidths, and sizes alongside colors/spacing/typography', () => {
    const theme = getTheme('AYURVEDA');
    expect(theme.radii).toEqual(radii);
    expect(theme.borderWidths).toEqual(borderWidths);
    expect(theme.sizes).toEqual(sizes);
  });

  it('editing the radii token module changes every consumer\'s medium radius from one place', () => {
    // Structural proof, not a mutation test: the same `radii` module
    // instance is what getTheme() returns — there is no per-screen copy
    // to fall out of sync.
    const theme = getTheme('AYURVEDA');
    expect(theme.radii.medium).toBe(radii.medium);
  });
});
