import React, { PropsWithChildren } from 'react';
import { View, ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../theme/useClinicTheme';
import { ThemedText } from './ThemedText';

export function ThemedCard({ title, icon, children, style, ...props }: PropsWithChildren<ViewProps & { title?: string; icon?: keyof typeof Ionicons.glyphMap }>) {
  const theme = useClinicTheme();
  return <View {...props} style={[{ padding: theme.spacing.md, gap: theme.spacing.sm, borderRadius: theme.radii.medium, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.default, backgroundColor: theme.colors.surface.default, minWidth: 0 }, style]}>
    {title && <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>{icon && <Ionicons name={icon} size={theme.sizes.iconMedium} color={theme.colors.text.primary} />}<ThemedText accessibilityRole="header" variant="subtitle1">{title}</ThemedText></View>}
    {children}
  </View>;
}
