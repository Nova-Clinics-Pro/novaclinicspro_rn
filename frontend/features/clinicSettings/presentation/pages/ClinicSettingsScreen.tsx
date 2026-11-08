/**
 * Clinic Settings Hub Screen
 * Central navigation for all clinic configuration
 */

import React from 'react';
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
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface SettingItem {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const SETTINGS_ITEMS: SettingItem[] = [
  {
    key: 'operating-hours',
    title: 'Operating Hours',
    description: 'Set clinic open/close times for each day',
    icon: 'time-outline',
    route: '/clinic-admin/settings/operating-hours',
    color: '#2F6F4E',
  },
  {
    key: 'rooms',
    title: 'Rooms & Resources',
    description: 'Manage therapy rooms and consultation spaces',
    icon: 'grid-outline',
    route: '/clinic-admin/settings/rooms',
    color: '#3B82F6',
  },
  {
    key: 'treatments',
    title: 'Treatments & Services',
    description: 'Configure Ayurvedic treatments and pricing',
    icon: 'leaf-outline',
    route: '/clinic-admin/settings/treatments',
    color: '#C28A4B',
  },
  {
    key: 'appointment-rules',
    title: 'Appointment Rules',
    description: 'Configure scheduling rules and constraints',
    icon: 'calendar-outline',
    route: '/clinic-admin/settings/appointment-rules',
    color: '#8B5CF6',
  },
  {
    key: 'templates',
    title: 'Document Templates',
    description: 'Manage casesheets and prescription templates',
    icon: 'document-text-outline',
    route: '/clinic-admin/settings/templates',
    color: '#EC4899',
  },
  {
    key: 'capabilities',
    title: 'Capabilities',
    description: 'Enable or disable clinic capabilities',
    icon: 'apps-outline',
    route: '/clinic-admin/settings/capabilities',
    color: '#0EA5E9',
  },
];

export const ClinicSettingsScreen: React.FC = () => {
  const router = useRouter();

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.key}
      style={styles.settingCard}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}: ${item.description}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        <Text style={styles.settingDescription}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Clinic Settings"
        subtitle="Configure your clinic"
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
            <Ionicons name="settings" size={32} color="#2F6F4E" />
          </View>
          <Text style={styles.introText}>
            Configure your clinic&apos;s operational settings, rooms, services, and scheduling rules.
          </Text>
        </View>

        {/* Settings List */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          {SETTINGS_ITEMS.map(renderSettingItem)}
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
          <Text style={styles.helpText}>
            Changes to settings may affect existing appointments. Review carefully before saving.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  introSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#2F6F4E15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: {
    flex: 1,
    ...typography.body2,
    color: '#4B5563',
    lineHeight: 20,
  },
  settingsSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h6,
    color: '#1F2937',
    marginBottom: spacing.md,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    ...typography.body2,
    color: '#6B7280',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  helpText: {
    flex: 1,
    ...typography.caption,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default ClinicSettingsScreen;
