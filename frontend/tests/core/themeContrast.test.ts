/**
 * Every clinic palette meets WCAG 2.1 AA for the text and background pairs the app uses (owner decision, 21 Nov 2026: accessibility is
 * fixed from the central theme). Disabled text is exempt, as WCAG exempts disabled controls.
 */
import { getClinicTheme, type ClinicType } from '../../core/theme/clinicThemes';
import type { SemanticColors } from '../../core/theme/semanticColors';
import { printPalette } from '../../core/theme/printPalette';

const AA_TEXT = 4.5;
const CLINIC_TYPES: ClinicType[] = ['AYURVEDA', 'GENERAL_MEDICINE', 'DENTAL', 'PHYSIOTHERAPY'];

const channel = (value: number) => {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
export const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const pick = (theme: SemanticColors, path: string): string => path.split('.').reduce<any>((node, key) => node[key], theme);

const PAIRS: [string, string][] = [
  ['text.primary', 'background.default'], ['text.primary', 'background.elevated'], ['text.primary', 'background.muted'],
  ['text.secondary', 'background.default'], ['text.secondary', 'background.elevated'], ['text.secondary', 'background.muted'],
  ['text.tertiary', 'background.default'], ['text.tertiary', 'background.elevated'], ['text.tertiary', 'background.muted'],
  ['text.link', 'background.default'], ['text.link', 'background.elevated'],
  ['primary.default', 'background.default'], ['primary.default', 'background.elevated'], ['primary.default', 'primary.soft'],
  ['primary.onPrimary', 'primary.default'],
  ['secondary.default', 'background.elevated'], ['secondary.default', 'background.default'],
  ['feedback.success', 'background.elevated'], ['feedback.success', 'feedback.successLight'],
  ['feedback.warning', 'background.elevated'], ['feedback.warning', 'feedback.warningLight'],
  ['feedback.error', 'background.elevated'], ['feedback.error', 'feedback.errorLight'],
  ['feedback.info', 'background.elevated'], ['feedback.info', 'feedback.infoLight'],
];

describe.each(CLINIC_TYPES)('%s palette contrast', (clinicType) => {
  const theme = getClinicTheme(clinicType);

  it.each(PAIRS)('%s on %s is at least 4.5:1', (foreground, background) => {
    const fg = pick(theme, foreground);
    const bg = pick(theme, background);
    expect(`${foreground} on ${background}: ${contrastRatio(fg, bg).toFixed(2)}`).toMatch(/.*/);
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('pressed and dark primaries stay darker than the default one', () => {
    expect(luminance(theme.primary.pressed)).toBeLessThanOrEqual(luminance(theme.primary.default));
    expect(luminance(theme.primary.dark)).toBeLessThanOrEqual(luminance(theme.primary.default));
  });
});

describe('print palette', () => {
  it('prints readable ink on paper', () => {
    for (const ink of [printPalette.ink, printPalette.headingInk, printPalette.labelInk, printPalette.mutedInk]) {
      expect(contrastRatio(ink, printPalette.paper)).toBeGreaterThanOrEqual(AA_TEXT);
    }
    expect(contrastRatio(printPalette.onAccent, printPalette.defaultAccent)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
