/**
 * Architecture guard: never render `{text && <View/>}` or `{count && <View/>}`.
 *
 * `{value && <X/>}` renders `value` itself when it is falsy. For a string that is "" and for a number it is 0, and React
 * Native cannot place a text node inside a <View>: the app crashes with "Unexpected text node: . A text node cannot be a
 * child of a <View>" (seen on the clinic dashboard when `tenantId` was ""). Booleans, null and undefined are safe.
 *
 * The fix is to make the condition a boolean: `{!!value && ...}`, `{value ? ... : null}` or `{value !== '' && ...}`.
 * This test uses the TypeScript type checker, so it flags only operands that can really be a string or a number.
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['app', 'features', 'core'];

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });

const canBeStringOrNumber = (type: ts.Type, checker: ts.TypeChecker): boolean => {
  if (type.isUnion()) return type.types.some(member => canBeStringOrNumber(member, checker));
  if (type.flags & ts.TypeFlags.Any || type.flags & ts.TypeFlags.Unknown) return false; // can't tell; not flagged
  if (type.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLiteral | ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral)) {
    // A non-empty string literal / non-zero number literal is always truthy, so it can never leak.
    if (type.isStringLiteral()) return type.value === '';
    if (type.isNumberLiteral()) return type.value === 0;
    return true;
  }
  const base = checker.getBaseConstraintOfType(type);
  return !!base && base !== type && canBeStringOrNumber(base, checker);
};

describe('no leaked text render', () => {
  it('every `{a && <JSX/>}` has a left operand that cannot be "" or 0', () => {
    const files = SCAN_DIRS.flatMap(dir => walk(path.join(ROOT, dir)));
    const config = ts.readConfigFile(path.join(ROOT, 'tsconfig.json'), ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
    const program = ts.createProgram(files, { ...parsed.options, noEmit: true, skipLibCheck: true });
    const checker = program.getTypeChecker();
    const offenders: string[] = [];

    for (const file of files) {
      const source = program.getSourceFile(file);
      if (!source) continue;
      const visit = (node: ts.Node): void => {
        // Only an expression rendered as a CHILD can leak a text node (a prop value like `title={a && b}` cannot).
        if (
          ts.isJsxExpression(node) &&
          (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
          node.expression &&
          ts.isBinaryExpression(node.expression) &&
          node.expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        ) {
          const left = node.expression.left;
          if (canBeStringOrNumber(checker.getTypeAtLocation(left), checker)) {
            const { line } = source.getLineAndCharacterOfPosition(left.getStart());
            offenders.push(`${path.relative(ROOT, file)}:${line + 1}  {${left.getText().slice(0, 60)} && ...}`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }

    expect(offenders).toEqual([]);
  }, 180000);
});
