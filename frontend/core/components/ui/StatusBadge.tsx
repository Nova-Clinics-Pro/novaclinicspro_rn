import React from 'react';
import { View } from 'react-native';
import { useClinicTheme } from '../../theme/useClinicTheme';
import { ThemedText } from './ThemedText';

export type StatusTone = 'success' | 'warning' | 'error' | 'neutral';
export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const theme = useClinicTheme();
  const backgroundColor = tone === 'neutral' ? theme.colors.surface.muted : theme.colors.feedback[`${tone}Light`];
  const color = tone === 'neutral' ? theme.colors.text.secondary : theme.colors.feedback[tone];
  return <View style={{ alignSelf: 'flex-start', backgroundColor, borderRadius: theme.radii.small, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
    <ThemedText variant="caption" style={{ color }}>{label}</ThemedText>
  </View>;
}
