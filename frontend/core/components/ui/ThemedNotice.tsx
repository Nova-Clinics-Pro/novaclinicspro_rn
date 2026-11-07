import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../theme/useClinicTheme';
import { ThemedText } from './ThemedText';

export function ThemedNotice({ children, tone = 'info', testID }: { children: string; tone?: 'info' | 'warning' | 'error' | 'success'; testID?: string }) {
  const theme = useClinicTheme();
  return <View testID={testID} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radii.small, backgroundColor: theme.colors.feedback[`${tone}Light`] }}>
    <Ionicons name={tone === 'error' ? 'warning-outline' : tone === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline'} size={theme.sizes.iconSmall} color={theme.colors.feedback[tone]} />
    <ThemedText variant="caption" style={{ flex: 1, color: theme.colors.text.primary }}>{children}</ThemedText>
  </View>;
}
