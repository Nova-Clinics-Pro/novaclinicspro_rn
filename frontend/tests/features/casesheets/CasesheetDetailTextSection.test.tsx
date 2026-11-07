import { Ionicons } from '@expo/vector-icons';
import { render } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import * as ts from 'typescript';
import { colors } from '../../../core/theme/colors';
import { CasesheetDetailTextSection } from '../../../features/casesheets/presentation/components/CasesheetDetailTextSection';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

describe('CasesheetDetailTextSection presentation boundary', () => {
  it.each(['Clinical text', '0', '  preserved whitespace  '])('renders populated text unchanged: %p', (text) => {
    const view = render(<CasesheetDetailTextSection title="Section title" text={text} icon="medical-outline" />);
    expect(view.getByText('Section title')).toBeTruthy();
    expect(view.getByText(text, { normalizer: (value) => value }).props.children).toBe(text);
    expect(view.UNSAFE_getByType(Ionicons).props).toEqual(expect.objectContaining({
      name: 'medical-outline', size: 18, color: colors.primary.main,
    }));
  });

  it.each(['', null, undefined])('omits the entire section for %p', (text) => {
    const view = render(<CasesheetDetailTextSection title="Omitted" text={text} icon="medical-outline" />);
    expect(view.toJSON()).toBeNull();
  });

  it('updates title, content and icon on rerender and can become empty and visible again', () => {
    const view = render(<CasesheetDetailTextSection title="Before" text="Original" icon="medical-outline" />);
    view.rerender(<CasesheetDetailTextSection title="After" text="Replacement" icon="eye-outline" />);
    expect(view.queryByText('Before')).toBeNull();
    expect(view.queryByText('Original')).toBeNull();
    expect(view.getByText('After')).toBeTruthy();
    expect(view.getByText('Replacement')).toBeTruthy();
    expect(view.UNSAFE_getByType(Ionicons).props.name).toBe('eye-outline');
    view.rerender(<CasesheetDetailTextSection title="After" icon="eye-outline" />);
    expect(view.toJSON()).toBeNull();
    view.rerender(<CasesheetDetailTextSection title="Again" text="Visible" icon="person-outline" />);
    expect(view.getByText('Visible')).toBeTruthy();
  });

  it('allows only presentation imports and no hidden dynamic dependencies', () => {
    const source = readFileSync(resolve(__dirname,
      '../../../features/casesheets/presentation/components/CasesheetDetailTextSection.tsx'), 'utf8');
    const tree = ts.createSourceFile('section.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const allowed = new Set(['react', 'react-native', '@expo/vector-icons',
      '../../../../core/theme/colors', '../../../../core/theme/spacing', '../../../../core/theme/typography']);
    const violations: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (specifier && (!ts.isStringLiteral(specifier) || !allowed.has(specifier.text))) {
          violations.push(node.getText(tree));
        }
      }
      if (ts.isImportEqualsDeclaration(node)) violations.push(node.getText(tree));
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && ['require', 'fetch', 'eval'].includes(node.expression.text)))) {
        violations.push(node.getText(tree));
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    expect(violations).toEqual([]);
  });
});
