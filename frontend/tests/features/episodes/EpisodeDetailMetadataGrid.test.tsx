import { Ionicons } from '@expo/vector-icons';
import { render } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as ts from 'typescript';
import { getClinicTheme, ClinicType } from '../../../core/theme/clinicThemes';
import { EpisodeDetailMetadataGrid } from '../../../features/episodes/presentation/components/EpisodeDetailMetadataGrid';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
const props = {
  startDateText: '1 Oct 2026', endDateText: '8 Oct 2026', lastVisitDateText: '7 Oct 2026',
  visitsCount: 3, showEndDate: true, showLastVisit: true,
  textColors: { primary: '#123456', tertiary: '#789ABC' },
};

describe('EpisodeDetailMetadataGrid display contract', () => {
  it('preserves the existing row, value, icon and native layout order', () => {
    const view = render(<EpisodeDetailMetadataGrid {...props} />);
    expect(view.UNSAFE_getAllByType(Text).map((node) => node.props.children)).toEqual([
      'Start Date', props.startDateText, 'End Date', props.endDateText,
      'Last Visit', props.lastVisitDateText, 'Total Visits', props.visitsCount,
    ]);
    expect(view.UNSAFE_getAllByType(Ionicons).map((node) => [node.props.name, node.props.size])).toEqual([
      ['calendar-outline', 16], ['calendar-outline', 16], ['time-outline', 16], ['medical-outline', 16],
    ]);
    const views = view.UNSAFE_getAllByType(View);
    expect(StyleSheet.flatten(views[0].props.style)).toEqual({
      flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16,
    });
    expect(StyleSheet.flatten(views[1].props.style)).toEqual({
      flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '45%',
    });
    expect(StyleSheet.flatten(view.getByText('Start Date').props.style)).toEqual({ fontSize: 12, color: props.textColors.tertiary });
    expect(StyleSheet.flatten(view.getByText(props.startDateText).props.style)).toEqual({ fontSize: 14, fontWeight: '600', color: props.textColors.primary });
  });

  it('uses explicit visibility even when optional display values are populated', () => {
    const view = render(<EpisodeDetailMetadataGrid {...props} showEndDate={false} showLastVisit={false} />);
    expect(view.queryByText('End Date')).toBeNull();
    expect(view.queryByText(props.endDateText)).toBeNull();
    expect(view.queryByText('Last Visit')).toBeNull();
    expect(view.queryByText(props.lastVisitDateText)).toBeNull();
    expect(view.getByText('Start Date')).toBeTruthy();
    expect(view.getByText('Total Visits')).toBeTruthy();
  });

  it.each([null, undefined, ''])('retains visible labels without inventing a value for %p', (value) => {
    const view = render(<EpisodeDetailMetadataGrid {...props} startDateText={value}
      endDateText={value} lastVisitDateText={value} visitsCount={null} />);
    expect(view.UNSAFE_getAllByType(Text).map((node) => node.props.children)).toEqual([
      'Start Date', value, 'End Date', value, 'Last Visit', value, 'Total Visits', null,
    ]);
  });

  it('preserves zero visits and updates values, visibility and theme on rerender', () => {
    const view = render(<EpisodeDetailMetadataGrid {...props} visitsCount={0} />);
    expect(view.getByText('0')).toBeTruthy();
    const next = { primary: '#ABCDEF', tertiary: '#FEDCBA' };
    view.rerender(<EpisodeDetailMetadataGrid {...props} startDateText="new display" visitsCount={7}
      showEndDate={false} textColors={next} />);
    expect(view.queryByText(props.startDateText)).toBeNull();
    expect(view.queryByText('End Date')).toBeNull();
    expect(view.getByText('7')).toBeTruthy();
    expect(StyleSheet.flatten(view.getByText('new display').props.style).color).toBe(next.primary);
    expect(StyleSheet.flatten(view.getByText('Last Visit').props.style).color).toBe(next.tertiary);
    expect(view.UNSAFE_getAllByType(Ionicons).every((node) => node.props.color === next.tertiary)).toBe(true);
  });

  it.each(['AYURVEDA', 'GENERAL_MEDICINE', 'DENTAL', 'PHYSIOTHERAPY'] as ClinicType[])(
    'preserves existing text roles for %s', (clinicType) => {
      const colors = getClinicTheme(clinicType);
      const view = render(<EpisodeDetailMetadataGrid {...props} textColors={colors.text} />);
      expect(StyleSheet.flatten(view.getByText('Start Date').props.style).color).toBe(colors.text.tertiary);
      expect(StyleSheet.flatten(view.getByText(props.startDateText).props.style).color).toBe(colors.text.primary);
    },
  );

  it('admits only native presentation dependencies and static style construction', () => {
    const source = readFileSync(resolve(__dirname,
      '../../../features/episodes/presentation/components/EpisodeDetailMetadataGrid.tsx'), 'utf8');
    const tree = ts.createSourceFile('metadata.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const allowed = new Set(['react', 'react-native', '@expo/vector-icons']);
    const violations: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (specifier && (!ts.isStringLiteral(specifier) || !allowed.has(specifier.text))) violations.push(node.getText(tree));
      }
      if (ts.isImportEqualsDeclaration(node) || ts.isNewExpression(node)) violations.push(node.getText(tree));
      if (ts.isCallExpression(node) && node.expression.getText(tree) !== 'StyleSheet.create') violations.push(node.getText(tree));
      ts.forEachChild(node, visit);
    };
    visit(tree);
    expect(violations).toEqual([]);
  });
});
