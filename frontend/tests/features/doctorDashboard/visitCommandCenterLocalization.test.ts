import enUS from '../../../core/localization/translations/en-US.json';
import hiIN from '../../../core/localization/translations/hi-IN.json';

type TranslationNode = string | { [key: string]: TranslationNode };

const leafPaths = (node: TranslationNode, prefix = ''): string[] => {
  if (typeof node === 'string') return [prefix];
  return Object.entries(node).flatMap(([key, value]) => leafPaths(value, prefix ? `${prefix}.${key}` : key));
};

const valueAt = (node: TranslationNode, path: string): TranslationNode | undefined => (
  path.split('.').reduce<TranslationNode | undefined>(
    (current, key) => (current && typeof current !== 'string' ? current[key] : undefined),
    node,
  )
);

describe('VisitCommandCenter localization (T-FE-G.2)', () => {
  it('keeps the full Command Center vocabulary and localized Back control valid in en-US and hi-IN', () => {
    const commandCenterPaths = leafPaths(enUS.visitCommandCenter as TranslationNode);

    expect(commandCenterPaths.length).toBeGreaterThan(0);
    commandCenterPaths.forEach((path) => {
      expect(typeof valueAt(hiIN.visitCommandCenter as TranslationNode, path)).toBe('string');
    });
    expect(typeof enUS.common.back).toBe('string');
    expect(typeof hiIN.common.back).toBe('string');
  });
});
