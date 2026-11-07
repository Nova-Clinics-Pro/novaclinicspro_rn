/** Package B guard for the ratified presentation data-access boundary. */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

function presentationSources(): string[] {
  const app = sourceFiles(path.join(FRONTEND_ROOT, 'app'));
  const featureRoots = sourceFiles(path.join(FRONTEND_ROOT, 'features')).filter((file) =>
    file.includes(`${path.sep}presentation${path.sep}`),
  );
  return [...app, ...featureRoots];
}

function violations(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const found: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      // A datasource import alone does not demonstrate a transport bypass
      // (some legacy imports are DTO/error contracts). This guard protects
      // the ratified P1 prohibition: presentation must not reach the shared
      // transport client directly. Feature query hooks remain the normal path.
      if (specifier.includes('core/api/axiosClient')) {
        found.push(`forbidden presentation import: ${specifier}`);
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'fetch') {
      found.push('forbidden raw fetch call');
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('Package B presentation data-access boundary', () => {
  it('keeps app routes and presentation modules behind feature query/command hooks', () => {
    const found = presentationSources().flatMap((file) =>
      violations(file).map((violation) => `${path.relative(FRONTEND_ROOT, file)}: ${violation}`),
    );

    expect(found).toEqual([]);
  });
});
