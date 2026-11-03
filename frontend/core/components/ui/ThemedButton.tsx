import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';
import { useClinicTheme } from '../../theme/useClinicTheme';
import { opacities } from '../../theme/semanticColors';

export function ThemedButton({ label, onPress, disabled = false, expanded, accessibilityLabel, icon, selected, variant = 'primary', fullWidth = false }: { label: string; accessibilityLabel?: string; onPress?: () => void; disabled?: boolean; expanded?: boolean; icon?: keyof typeof Ionicons.glyphMap; selected?: boolean; variant?: 'primary' | 'subtle' | 'outline'; /** Opt-in: share row width equally with sibling controls. */ fullWidth?: boolean }) {
  const theme = useClinicTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled, ...(selected === undefined ? {} : { selected }), ...(expanded === undefined ? {} : { expanded }) }} disabled={disabled} onPress={onPress} style={{ backgroundColor: selected ? theme.colors.primary.soft : variant === 'primary' ? theme.colors.primary.default : variant === 'outline' ? theme.colors.surface.default : theme.colors.surface.muted, borderWidth: variant === 'outline' || selected ? theme.borderWidths.default : undefined, borderColor: selected ? theme.colors.primary.default : theme.colors.border.default, flexDirection: 'row', gap: theme.spacing.sm, alignSelf: fullWidth ? 'stretch' : variant !== 'primary' ? 'flex-start' : undefined, flex: fullWidth ? 1 : undefined, borderRadius: theme.radii.medium, minHeight: theme.sizes.touchTarget, paddingHorizontal: variant === 'primary' ? theme.spacing.md : theme.spacing.sm, paddingVertical: theme.spacing.sm, justifyContent: 'center', alignItems: 'center', opacity: disabled ? opacities.disabled : 1 }}>
    {icon && <Ionicons name={icon} size={theme.sizes.iconSmall} color={variant === 'primary' ? theme.colors.text.onPrimary : theme.colors.text.primary} />}
    <Text style={{ ...theme.typography.button, color: variant === 'primary' ? theme.colors.text.onPrimary : theme.colors.text.link }}>{label}</Text>
  </Pressable>;
}
