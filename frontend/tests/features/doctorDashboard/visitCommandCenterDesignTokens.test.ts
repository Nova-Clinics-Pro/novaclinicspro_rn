import fs from 'fs';
import path from 'path';

/**
 * R7 UI Governance Correction — proves `VisitCommandCenter.tsx` and
 * `WhyTodaySection.tsx` consume centralized design tokens instead of
 * hard-coded reusable visual values.
 *
 * Technique: source-inspection (matching `navigationEntryPoints
 * .characterization.test.ts`'s own precedent) — every assertion here is
 * about STRUCTURE (which token a style expression references), not
 * runtime rendering, since regex-scanning the exact source text is the
 * only way to reliably distinguish "raw reusable number" from
 * "structural layout value" without a false-positive-prone blanket rule
 * (e.g. `flex: 1` must remain legal).
 */

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

const shellSource = read('../../../features/episodes/presentation/pages/VisitCommandCenter.tsx');
const whyTodaySource = read('../../../features/episodes/presentation/components/WhyTodaySection.tsx');

describe('VisitCommandCenter.tsx — no raw reusable visual values', () => {
  it('does not hard-code an icon size (size={number})', () => {
    expect(shellSource).not.toMatch(/size=\{\d+\}/);
  });

  it('references sizes.iconMedium for the Ionicons size prop', () => {
    expect(shellSource).toMatch(/size=\{sizes\.iconMedium\}/);
  });

  it('does not hard-code a raw touch-target minHeight/minWidth', () => {
    expect(shellSource).not.toMatch(/minHeight:\s*44/);
    expect(shellSource).not.toMatch(/minWidth:\s*44/);
  });

  it('references sizes.touchTarget for the accessible touch target', () => {
    expect(shellSource).toMatch(/minHeight:\s*sizes\.touchTarget/);
    expect(shellSource).toMatch(/minWidth:\s*sizes\.touchTarget/);
  });

  it('does not hard-code a raw borderWidth/borderBottomWidth number', () => {
    expect(shellSource).not.toMatch(/borderBottomWidth:\s*\d/);
    expect(shellSource).not.toMatch(/borderWidth:\s*\d/);
  });

  it('references borderWidths.hairline for the header border', () => {
    expect(shellSource).toMatch(/borderBottomWidth:\s*borderWidths\.hairline/);
  });

  it('does not use spacing.* as a corner-radius value', () => {
    expect(shellSource).not.toMatch(/borderRadius:\s*spacing\./);
  });

  it('destructures borderWidths and sizes from useClinicTheme -- no radii token: T-FE-E.2 closure moved the shell\'s only card (the Treatment Plan placeholder) into TreatmentPlanModule, which owns its own radii usage', () => {
    expect(shellSource).toMatch(/const\s*\{[^}]*borderWidths[^}]*sizes[^}]*\}\s*=\s*useClinicTheme\(\)/);
    expect(shellSource).not.toMatch(/\bradii\b/);
  });
});

describe('WhyTodaySection.tsx — no raw reusable visual values', () => {
  it('does not hard-code a raw borderWidth number', () => {
    expect(whyTodaySource).not.toMatch(/borderWidth:\s*\d/);
  });

  it('references borderWidths.default for its card border', () => {
    expect(whyTodaySource).toMatch(/borderWidth:\s*borderWidths\.default/);
  });

  it('does not use spacing.* as a corner-radius value', () => {
    expect(whyTodaySource).not.toMatch(/borderRadius:\s*spacing\./);
  });

  it('references a radii token for the card corner radius', () => {
    expect(whyTodaySource).toMatch(/borderRadius:\s*radii\.medium/);
  });

  it('has no raw icon size or touch-target dimension (no icons/interactive touch targets in this component)', () => {
    expect(whyTodaySource).not.toMatch(/size=\{\d+\}/);
    expect(whyTodaySource).not.toMatch(/minHeight:\s*44/);
    expect(whyTodaySource).not.toMatch(/minWidth:\s*44/);
  });
});

describe('accessibility is preserved through the correction', () => {
  it('the back button retains its accessibilityRole and touch-target sizing', () => {
    expect(shellSource).toMatch(/accessibilityRole="button"[\s\S]{0,120}sizes\.touchTarget/);
  });
});

describe('structural layout values remain legal (not treated as violations)', () => {
  it('still permits flex/flexDirection/alignItems/justifyContent as component-local layout', () => {
    expect(shellSource).toMatch(/flex:\s*1/);
    expect(shellSource).toMatch(/flexDirection:\s*'row'/);
    expect(shellSource).toMatch(/alignItems:\s*'center'/);
    expect(shellSource).toMatch(/justifyContent:/);
  });
});
