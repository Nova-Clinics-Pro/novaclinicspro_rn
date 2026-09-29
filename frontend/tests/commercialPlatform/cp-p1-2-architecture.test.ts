import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const packageRoot = resolve(__dirname, '../..');
const featureRoot = join(packageRoot, 'features/commercialPlatform');
const expected = new Set([
  'features/commercialPlatform/contracts/context.ts',
  'features/commercialPlatform/contracts/errors.ts',
  'features/commercialPlatform/contracts/result.ts',
  'features/commercialPlatform/contracts/serialization.ts',
  'features/commercialPlatform/contracts/version.ts',
  'features/commercialPlatform/domain/references.ts',
  'features/commercialPlatform/fixtures/cp-p1-2-v1.json',
]);
const forbiddenImports = [
  'axios',
  'expo',
  'expo-router',
  'react',
  'react-native',
  '@tanstack/react-query',
  'zustand',
];
const forbiddenHostTerms = ['clinicId', 'organizationId', 'organizationTenantId', 'tenantId', 'workspaceId'];

function files(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    return statSync(path).isDirectory() ? files(path) : [relative(packageRoot, path)];
  });
}

describe('CP-P1.2 frontend architecture', () => {
  it('matches the frozen package matrix', () => {
    const actual = new Set(files(featureRoot));
    for (const relativePath of expected) expect(actual).toContain(relativePath);
  });

  it('has no framework, transport, query, store, presentation, or host dependency', () => {
    for (const relativePath of [...expected].filter((path) => path.endsWith('.ts'))) {
      const source = readFileSync(join(packageRoot, relativePath), 'utf8');
      for (const dependency of forbiddenImports) {
        expect(source).not.toMatch(new RegExp(`from ['\"]${dependency}(?:/|['\"])`));
      }
      expect(source).not.toMatch(/features\/onboarding|core\/|app\//);
      for (const term of forbiddenHostTerms) expect(source).not.toContain(term);
    }
  });
});
