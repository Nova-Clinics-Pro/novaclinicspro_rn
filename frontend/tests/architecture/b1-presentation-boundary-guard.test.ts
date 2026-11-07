import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as ts from 'typescript';

const packageRoot = resolve(__dirname, '../..');
const presentationRoots = [join(packageRoot, 'app'), join(packageRoot, 'features')];
const httpStatusCodes = new Set(['400', '401', '403', '404', '409', '422', '500', '502', '503']);

const collectPresentationFiles = (root: string, includeAll = false): string[] => {
  if (!ts.sys.directoryExists(root)) return [];

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      return collectPresentationFiles(path, includeAll || entry.name === 'presentation');
    }
    return includeAll && /\.(?:ts|tsx|js|jsx)$/u.test(entry.name) ? [path] : [];
  });
};

const sourceFiles = () => [
  ...collectPresentationFiles(presentationRoots[0], true),
  ...collectPresentationFiles(presentationRoots[1]),
].sort();

const sourceFile = (filename: string, source: string) =>
  ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

const isNetworkModule = (moduleName: string) =>
  moduleName === 'axios' ||
  moduleName.startsWith('axios/') ||
  moduleName.includes('core/api/axiosClient') ||
  moduleName === '@supabase/supabase-js' ||
  moduleName.startsWith('@supabase/') ||
  moduleName === 'expo-notifications';

const isNetworkDynamicImport = (specifier: ts.Expression) =>
  ts.isStringLiteral(specifier) && /(?:axios|api|http|datasource|supabase)/iu.test(specifier.text);

const scan = (filename: string, source: string): string[] => {
  const violations: string[] = [];
  const parsed = sourceFile(filename, source);

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && isNetworkModule(node.moduleSpecifier.text)) {
      violations.push(`forbidden presentation import: ${node.moduleSpecifier.text}`);
    }

    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && isNetworkDynamicImport(node.arguments[0])) {
        violations.push('dynamic network import');
      }
      if (ts.isIdentifier(node.expression) && node.expression.text === 'fetch') {
        violations.push('presentation fetch call');
      }
      if (ts.isIdentifier(node.expression) && /Api$/u.test(node.expression.text)) {
        violations.push(`presentation datasource invocation: ${node.expression.text}`);
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        /Api$/u.test(node.expression.name.text)
      ) {
        violations.push(`presentation datasource invocation: ${node.expression.name.text}`);
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'includes' &&
        ts.isStringLiteral(node.arguments[0]) &&
        ['401', '403'].includes(node.arguments[0].text)
      ) {
        violations.push(`HTTP-code message inference: ${node.arguments[0].text}`);
      }
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === 'response' &&
      ts.isIdentifier(node.expression) &&
      /^(?:error|err|e|exception)$/u.test(node.expression.text)
    ) {
      violations.push('raw transport response parsing');
    }

    if (
      ts.isBinaryExpression(node) &&
      ['===', '!==', '==', '!='].includes(node.operatorToken.getText(parsed)) &&
      ((ts.isNumericLiteral(node.left) && httpStatusCodes.has(node.left.text)) ||
        (ts.isNumericLiteral(node.right) && httpStatusCodes.has(node.right.text)))
    ) {
      violations.push('raw HTTP status comparison');
    }

    if (ts.isStringLiteral(node) && /^\/?api\/v\d+/u.test(node.text)) {
      violations.push(`presentation endpoint ownership: ${node.text}`);
    }

    ts.forEachChild(node, visit);
  };

  visit(parsed);
  return violations;
};

describe('B1 presentation boundary ratchet', () => {
  it('keeps presentation and route adapters free of transport ownership', () => {
    const violations = sourceFiles().flatMap((filename) =>
      scan(filename, readFileSync(filename, 'utf8')).map((violation) => `${filename}: ${violation}`)
    );

    expect(violations).toEqual([]);
  });

  it('detects representative transport ownership regressions', () => {
    expect(scan('sample.ts', "import axios from 'axios';")).toContain('forbidden presentation import: axios');
    expect(scan('sample.ts', "fetch('/api/v1/clinics');")).toEqual(
      expect.arrayContaining(['presentation fetch call', 'presentation endpoint ownership: /api/v1/clinics'])
    );
    expect(scan('sample.ts', "if (error.response?.status === 401) return error.message.includes('401');")).toEqual(
      expect.arrayContaining(['raw transport response parsing', 'raw HTTP status comparison', 'HTTP-code message inference: 401'])
    );
  });
});
