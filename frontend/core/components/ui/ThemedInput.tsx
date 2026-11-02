import React from 'react';
import { TextInput } from 'react-native';
import { useClinicTheme } from '../../theme/useClinicTheme';

export function ThemedInput({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  const theme = useClinicTheme();
  return <TextInput accessibilityLabel={label} placeholder={label} placeholderTextColor={theme.colors.text.tertiary} value={value} onChangeText={onChangeText} style={{ ...theme.typography.body1, color: theme.colors.text.primary, backgroundColor: theme.colors.surface.default, borderColor: theme.colors.border.default, borderWidth: theme.borderWidths.default, borderRadius: theme.radii.medium, minHeight: theme.sizes.touchTarget, padding: theme.spacing.sm }} />;
}
