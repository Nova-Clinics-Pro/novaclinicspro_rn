import React from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { useClinicTheme } from '../../theme/useClinicTheme';

export interface DataColumn<T> { key: string; label: string; weight?: number; render: (row: T) => React.ReactNode }
export function DataTable<T extends { id: string }>({ rows, columns, details, expandedId }: { rows: T[]; columns: DataColumn<T>[]; expandedId?: string | null; details?: (row: T) => React.ReactNode }) {
  const theme = useClinicTheme();
  const compact = useWindowDimensions().width < theme.sizes.wideLayout;
  return <View testID={compact ? "data-table-mobile" : "data-table-desktop"}>
    {!compact && <View style={{ flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.sm, backgroundColor: theme.colors.surface.muted }}>{columns.map(c => <Text key={c.key} style={{ ...theme.typography.caption, minWidth: 0, flex: c.weight ?? 1, color: theme.colors.text.primary }}>{c.label}</Text>)}</View>}
    {rows.map(row => <View key={row.id} style={{ borderWidth: theme.borderWidths.default, borderRadius: theme.radii.medium, borderColor: expandedId === row.id ? theme.colors.primary.default : theme.colors.border.default, backgroundColor: expandedId === row.id ? theme.colors.primary.soft : theme.colors.surface.default, padding: theme.spacing.sm, gap: theme.spacing.sm }}>
      <View style={{ flexDirection: compact ? 'column' : 'row', gap: theme.spacing.sm }}>{columns.map(c => <View key={c.key} style={{ flex: compact ? undefined : c.weight ?? 1, minWidth: 0, gap: theme.spacing.xs }}>
        {compact && <Text style={{ ...theme.typography.subtitle2, color: theme.colors.text.secondary }}>{c.label}</Text>}{c.render(row)}
      </View>)}</View>{details?.(row)}
    </View>)}
  </View>;
}
