import React from 'react';
import { TextInput } from 'react-native';
import { useClinicTheme } from '../../theme/useClinicTheme';

export function ThemedInput({ label, value, onChangeText, multiline = false, maxLength }: { label: string; value: string; onChangeText: (value: string) => void; /** Opt-in: taller, top-aligned input for free text. */ multiline?: boolean; /** Opt-in: hard character limit enforced by the input. */ maxLength?: number }) {
  const theme = useClinicTheme();
  return <TextInput accessibilityLabel={label} placeholder={label} placeholderTextColor={theme.colors.text.tertiary} value={value} onChangeText={onChangeText} multiline={multiline} maxLength={maxLength} numberOfLines={multiline ? 3 : undefined} textAlignVertical={multiline ? 'top' : undefined} style={{ ...theme.typography.body1, color: theme.colors.text.primary, backgroundColor: theme.colors.surface.default, borderColor: theme.colors.border.default, borderWidth: theme.borderWidths.default, borderRadius: theme.radii.medium, minHeight: theme.sizes.touchTarget, padding: theme.spacing.sm, ...(multiline ? { minHeight: theme.sizes.inputMultilineMinHeight } : {}) }} />;
}
