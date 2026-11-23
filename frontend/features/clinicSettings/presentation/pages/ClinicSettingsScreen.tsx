/**
 * Clinic Settings Hub Screen
 * Central navigation for all clinic configuration
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { isCapabilityPlatformEnabled, useFeatures } from '../../../../core/hooks/useFeatures';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import { mayManageRolePermissions } from '../../../auth/domain/entities/auth.entity';

interface SettingItem {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const S = 'clinicAdmin.settings.';

/** The settings every clinic has; the card's words are translation keys, resolved when the screen renders. */
const SETTING_DEFINITIONS = [
  { key: 'operating-hours', titleKey: S + 'operatingHoursTitle', descriptionKey: S + 'operatingHoursDescription', icon: 'time-outline', route: '/clinic-admin/settings/operating-hours' },
  { key: 'rooms', titleKey: S + 'roomsTitle', descriptionKey: S + 'roomsDescription', icon: 'grid-outline', route: '/clinic-admin/settings/rooms' },
  { key: 'treatments', titleKey: S + 'treatmentsTitle', descriptionKey: S + 'treatmentsDescription', icon: 'leaf-outline', route: '/clinic-admin/settings/treatments' },
  { key: 'appointment-rules', titleKey: S + 'appointmentRulesTitle', descriptionKey: S + 'appointmentRulesDescription', icon: 'calendar-outline', route: '/clinic-admin/settings/appointment-rules' },
  { key: 'templates', titleKey: S + 'templatesTitle', descriptionKey: S + 'templatesDescription', icon: 'document-text-outline', route: '/clinic-admin/settings/templates' },
  { key: 'capabilities', titleKey: S + 'capabilitiesTitle', descriptionKey: S + 'capabilitiesDescription', icon: 'apps-outline', route: '/clinic-admin/settings/capabilities' },
] as const;

export const ClinicSettingsScreen: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const currentUser = useAuthStore(state => state.currentUser);
  const features = useFeatures();
  // Role customization is the owner's tool; it is not offered when the session says the user holds another role.
  const settingItems: SettingItem[] = SETTING_DEFINITIONS.map(({ titleKey, descriptionKey, ...rest }) => ({ ...rest, title: t(titleKey), description: t(descriptionKey) }));
  const allItems: SettingItem[] = currentUser && mayManageRolePermissions(currentUser)
    ? [
        ...settingItems,
        {
          key: 'role-permissions',
          title: t('rolePermissions.title'),
          description: t('rolePermissions.hubDescription'),
          icon: 'shield-checkmark-outline',
          route: '/clinic-admin/settings/role-permissions',
        },
      ]
    : settingItems;
  // The capabilities screen needs the Capability Platform; where it is off, its endpoints answer 404, so the entry is not offered.
  const items = allItems.filter(item => item.key !== 'capabilities' || isCapabilityPlatformEnabled(features));

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.key}
      style={styles.settingCard}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}: ${item.description}`}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon} size={theme.sizes.iconLarge} color={theme.colors.primary.default} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        <Text style={styles.settingDescription}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={theme.sizes.iconMedium} color={theme.colors.text.secondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title={t('clinicAdmin.settings.title')}
        subtitle={t('clinicAdmin.settings.subtitle')}
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Section */}
        <View style={styles.introSection}>
          <View style={styles.introIcon}>
            <Ionicons name="settings" size={theme.sizes.iconLarge} color={theme.colors.primary.default} />
          </View>
          <Text style={styles.introText}>{t('clinicAdmin.settings.intro')}</Text>
        </View>

        {/* Settings List */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('clinicAdmin.settings.configuration')}</Text>
          {items.map(renderSettingItem)}
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Ionicons name="information-circle-outline" size={theme.sizes.iconMedium} color={theme.colors.text.secondary} />
          <Text style={styles.helpText}>{t('clinicAdmin.settings.help')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: ClinicTheme) => {
  const { colors, spacing, typography, radii, borderWidths, sizes } = theme;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.default },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: spacing.xl },
    introSection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.elevated,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.large,
      gap: spacing.md,
      borderWidth: borderWidths.default,
      borderColor: colors.border.subtle,
    },
    introIcon: {
      width: sizes.touchTarget + spacing.sm + spacing.xs,
      height: sizes.touchTarget + spacing.sm + spacing.xs,
      borderRadius: radii.large,
      backgroundColor: colors.primary.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    introText: { flex: 1, ...typography.body2, color: colors.text.secondary },
    settingsSection: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
    sectionTitle: { ...typography.h6, color: colors.text.primary, marginBottom: spacing.md },
    settingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.elevated,
      padding: spacing.md,
      borderRadius: radii.large,
      marginBottom: spacing.sm,
      borderWidth: borderWidths.default,
      borderColor: colors.border.subtle,
      minHeight: sizes.touchTarget,
    },
    iconContainer: {
      width: sizes.touchTarget + spacing.xs,
      height: sizes.touchTarget + spacing.xs,
      borderRadius: radii.large,
      backgroundColor: colors.primary.soft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    settingInfo: { flex: 1 },
    settingTitle: { ...typography.body1, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs / 2 },
    settingDescription: { ...typography.body2, color: colors.text.secondary },
    helpSection: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: spacing.xs },
    helpText: { flex: 1, ...typography.caption, color: colors.text.secondary },
  });
};

export default ClinicSettingsScreen;
