import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useClinicTheme } from '../theme/useClinicTheme';
import { t } from '../localization';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
  onBackPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onLogoutPress?: () => void;
  notificationCount?: number;
  showNotifications?: boolean;
  rightAction?: React.ReactNode;
  showActionLabels?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, subtitle, userName, onBackPress, onNotificationPress, onProfilePress, onLogoutPress, notificationCount = 0, showNotifications = true, rightAction, showActionLabels = false }) => {
  const theme = useClinicTheme();
  const icon = (name: keyof typeof Ionicons.glyphMap) => <Ionicons name={name} size={theme.sizes.iconMedium} color={theme.colors.text.primary} />;
  const buttonStyle = { minHeight: theme.sizes.touchTarget, minWidth: theme.sizes.touchTarget, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: theme.radii.pill, backgroundColor: theme.colors.surface.muted };
  const notifications = <View>{icon('notifications-outline')}{notificationCount > 0 && <Text style={{ ...theme.typography.caption, color: theme.colors.text.primary }}>{notificationCount > 99 ? '99+' : notificationCount}</Text>}</View>;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md, borderBottomWidth: theme.borderWidths.default, borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.default }}>
    {onBackPress && <Pressable accessibilityRole="button" accessibilityLabel={t('common.goBack')} onPress={onBackPress} style={buttonStyle}>{icon('arrow-back')}</Pressable>}
    <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ ...theme.typography.h4, color: theme.colors.text.primary }}>{title}</Text>
      {!!subtitle && <Text style={{ ...theme.typography.body2, color: theme.colors.text.secondary }}>{subtitle}</Text>}
      {!!userName && <Text style={{ ...theme.typography.caption, color: theme.colors.text.secondary }}>{userName}</Text>}
    </View>
    {rightAction}
    {showNotifications && (onNotificationPress ? <Pressable accessibilityRole="button" accessibilityLabel={t('navigation.notifications')} onPress={onNotificationPress} style={buttonStyle}>{notifications}</Pressable> : <Link href="/notifications" asChild><Pressable accessibilityRole="button" accessibilityLabel={t('navigation.notifications')} style={buttonStyle}>{notifications}</Pressable></Link>)}
    {onProfilePress && <Pressable accessibilityRole="button" accessibilityLabel={t('navigation.profile')} onPress={onProfilePress} style={buttonStyle}>{icon('person-circle')}</Pressable>}
    {onLogoutPress && <Pressable accessibilityRole="button" accessibilityLabel={t('navigation.logout')} onPress={onLogoutPress} style={[buttonStyle, showActionLabels && { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.small, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.default }]}>{icon('log-out-outline')}{showActionLabels && <Text style={{ ...theme.typography.caption, color: theme.colors.text.primary }}>{t('navigation.logout')}</Text>}</Pressable>}
  </View>;
};
