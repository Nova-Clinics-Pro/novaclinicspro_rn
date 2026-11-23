/**
 * Ratchet guard for the central theme and translations (owner decision, 21 Nov 2026, scoped 23 Nov 2026).
 *
 * Every colour, font size and piece of user-facing text must come from the central theme or the translation files, not be typed into a
 * screen. Hundreds of older places still do; this guard stops NEW ones and makes the old ones count down:
 *   - a file may never have MORE hard-coded colours, font sizes, typed-in texts or imports of the old static palette than the baseline records for it,
 *   - a file the baseline does not list may have none,
 *   - when a file improves, the baseline must be tightened so the gain is locked in:
 *       UPDATE_THEME_BASELINE=1 yarn jest tests/architecture/themeAndTextGuard.test.ts
 *
 * What counts: a string that is a colour (#rrggbb, rgb(), rgba()), a numeric `fontSize`, visible text written directly in JSX,
 * letters in a placeholder/title/label/accessibility prop written as a plain string, and an import of the old static palette
 * (`core/theme/colors`), which bypasses the clinic-type theme. The theme's own token files and the translation
 * files are where those values belong, so they are not scanned.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import * as ts from 'typescript';

const packageRoot = resolve(__dirname, '../..');
const BASELINE = join(__dirname, 'themeAndTextBaseline.json');
const SCANNED_ROOTS = ['app', 'features', 'core'];
const NOT_SCANNED = ['core/theme/', 'core/localization/'];
const TEXT_PROPS = new Set(['placeholder', 'title', 'label', 'accessibilityLabel', 'accessibilityHint', 'alt']);
const COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(/i;

type Counts = { colors: number; fontSizes: number; texts: number; staticPalette: number };

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === '__tests__' ? [] : sourceFiles(path);
    return /\.(?:ts|tsx)$/u.test(entry.name) && !/\.(?:test|spec|d)\.tsx?$/u.test(entry.name) ? [path] : [];
  });

const count = (filename: string, source: string): Counts => {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const counts: Counts = { colors: 0, fontSizes: 0, texts: 0, staticPalette: 0 };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && /(^|\/)theme\/colors$/u.test(node.moduleSpecifier.text)) counts.staticPalette += 1;
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && COLOUR.test(node.text)) counts.colors += 1;
    if (ts.isPropertyAssignment(node) && node.name.getText(file) === 'fontSize' && ts.isNumericLiteral(node.initializer)) counts.fontSizes += 1;
    if (ts.isJsxText(node) && /[A-Za-z]{2,}/u.test(node.text)) counts.texts += 1;
    if (ts.isJsxAttribute(node) && TEXT_PROPS.has(node.name.getText(file)) && node.initializer && ts.isStringLiteral(node.initializer) && /[A-Za-z]{2,}/u.test(node.initializer.text)) counts.texts += 1;
    ts.forEachChild(node, visit);
  };
  visit(file);
  return counts;
};

const scan = (): Record<string, Counts> => {
  const found: Record<string, Counts> = {};
  for (const root of SCANNED_ROOTS) {
    for (const path of sourceFiles(join(packageRoot, root))) {
      const name = relative(packageRoot, path).split('\\').join('/');
      if (NOT_SCANNED.some((prefix) => name.startsWith(prefix))) continue;
      const counts = count(name, readFileSync(path, 'utf8'));
      if (counts.colors + counts.fontSizes + counts.texts + counts.staticPalette > 0) found[name] = counts;
    }
  }
  return Object.fromEntries(Object.entries(found).sort(([a], [b]) => a.localeCompare(b)));
};

const current = scan();

if (process.env.UPDATE_THEME_BASELINE === '1') writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
const baseline: Record<string, Counts> = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
const METRICS: (keyof Counts)[] = ['colors', 'fontSizes', 'texts', 'staticPalette'];
const total = (all: Record<string, Counts>, metric: keyof Counts) => Object.values(all).reduce((sum, c) => sum + c[metric], 0);

describe('central theme and translations guard', () => {
  it('no file has more hard-coded colours, font sizes or typed-in texts than its baseline (new code uses the theme and translations)', () => {
    const worse = Object.entries(current).flatMap(([file, counts]) =>
      METRICS.filter((metric) => counts[metric] > (baseline[file]?.[metric] ?? 0)).map(
        (metric) => `${file}: ${counts[metric]} ${metric} (allowed ${baseline[file]?.[metric] ?? 0})`
      )
    );
    expect(worse).toEqual([]);
  });

  it('the baseline is tight: an improvement is locked in by updating it', () => {
    const stale = Object.entries(baseline).flatMap(([file, allowed]) =>
      METRICS.filter((metric) => (current[file]?.[metric] ?? 0) < allowed[metric]).map(
        (metric) => `${file}: ${current[file]?.[metric] ?? 0} ${metric} now, baseline says ${allowed[metric]}`
      )
    );
    expect(stale).toEqual([]);
  });

  it('reports where the app stands', () => {
    // eslint-disable-next-line no-console
    console.info(`theme/text debt: ${total(current, 'colors')} colours, ${total(current, 'fontSizes')} font sizes, ${total(current, 'texts')} typed-in texts, ${total(current, 'staticPalette')} imports of the old static palette in ${Object.keys(current).length} files`);
    expect(Object.keys(current).length).toBeGreaterThanOrEqual(0);
  });
});
