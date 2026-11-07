// @ts-nocheck -- The repository TypeScript baseline excludes Jest/Node globals.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readFrontendFile = (path: string) =>
  readFileSync(resolve(__dirname, '../../../', path), 'utf8');

describe('Case Sheets page module initialization', () => {
  it('does not re-enter its own presentation barrel through the feature index', () => {
    const exportedScreens = [
      'CasesheetsListScreen.tsx',
      'CasesheetDetailScreen.tsx',
      'CasesheetStandaloneScreen.tsx',
    ].map((fileName) =>
      readFrontendFile(`features/casesheets/presentation/pages/${fileName}`),
    );
    const featureIndex = readFrontendFile('features/casesheets/index.ts');
    const pagesIndex = readFrontendFile('features/casesheets/presentation/pages/index.ts');

    expect(featureIndex).toContain("export * from './presentation/pages'");
    expect(pagesIndex).toContain(
      "export { CasesheetsListScreen } from './CasesheetsListScreen'",
    );
    for (const screen of exportedScreens) {
      expect(screen).not.toMatch(/from ['"]\.\.\/\.\.\/index['"]/);
    }
    expect(exportedScreens[0]).toContain(
      "from '../../data/repositories/casesheets.repository.impl'",
    );
    expect(exportedScreens[0]).toContain("from '../../data/models/casesheets.dtos'");
  });
});
