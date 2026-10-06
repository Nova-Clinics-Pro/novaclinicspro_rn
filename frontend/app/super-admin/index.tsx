/**
 * Super Admin Dashboard
 * System-wide overview for super administrators
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { DashboardHeader } from '../../core/components/DashboardHeader';
import { StatCard } from '../../core/components/StatCard';
import { QuickActionButton } from '../../core/components/QuickActionButton';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { useAuth } from '../../features/auth/presentation/hooks/useAuth';
import { formatInrCurrency } from '../../core/utils/currency';
import { t, ErrorTokens } from '../../core/localization';

export default function SuperAdminDashboard() {
  const { logout, currentUser } = useAuth();

  const handleLogout = async () => {
    // Use confirm for web, Alert for native
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        try {
          await logout();
        } catch {
          window.alert('Logout failed. Please try again.');
        }
      }
    } else {
      Alert.alert(
        t('confirmations.logout'),
        t('confirmations.logout'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('navigation.logout'),
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
              } catch {
                Alert.alert(t('common.error'), t(ErrorTokens.auth.logoutFailed));
              }
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Super Admin Dashboard"
        subtitle="System Overview"
        userName={currentUser?.fullName || 'Admin'}
        onNotificationPress={() => console.log('Notifications')}
        onProfilePress={() => console.log('Profile')}
        onLogoutPress={handleLogout}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* System-wide Stats - Show 0 values instead of dummy data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <StatCard
                title="Total Clinics"
                value="0"
                icon="business"
                color={colors.primary.main}
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Active Subscriptions"
                value="0"
                icon="checkmark-circle"
                color={colors.success.main}
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Total Revenue"
                value={formatInrCurrency(0)}
                icon="cash"
                color={colors.warning.main}
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Total Patients"
                value="0"
                icon="people"
                color={colors.info.main}
              />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              icon="business"
              label="Manage Tenants"
              href="/super-admin/tenants"
              color={colors.primary.main}
            />
            <QuickActionButton
              icon="document-text"
              label="Applications"
              href="/super-admin/applications"
              color={colors.secondary.main}
            />
            <QuickActionButton
              icon="card"
              label="Finance"
              href="/super-admin/billing"
              color={colors.success.main}
            />
            <QuickActionButton
              icon="bar-chart"
              label="Analytics"
              onPress={() => Alert.alert(t('common.comingSoon'), t('common.featureUnavailable'))}
              color={colors.info.main}
            />
            <QuickActionButton
              icon="settings"
              label="System Config"
              onPress={() => Alert.alert(t('common.comingSoon'), t('common.featureUnavailable'))}
              color={colors.warning.main}
            />
            <QuickActionButton
              icon="people"
              label="User Management"
              onPress={() => Alert.alert(t('common.comingSoon'), t('common.featureUnavailable'))}
              color={colors.error.main}
            />
          </View>
        </View>

        {/* Recent Clinic Onboarding - Empty State instead of dummy data */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Clinic Onboarding</Text>
            <Link href="/super-admin/tenants" asChild>
              <Pressable>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </Link>
          </View>
          {/* Empty state - no dummy data */}
          <View style={styles.emptyStateCard}>
            <Ionicons name="business-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyStateTitle}>No recent onboarding</Text>
            <Text style={styles.emptyStateText}>
              New clinic registrations will appear here
            </Text>
          </View>
        </View>

        {/* Navigation to Other Dashboards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Switch Dashboard</Text>
          <View style={styles.dashboardLinks}>
            <Link href="/clinic-admin" asChild>
              <Pressable style={styles.dashboardLink}>
                <Ionicons name="business" size={20} color={colors.primary.main} />
                <Text style={styles.dashboardLinkText}>Clinic Admin</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
              </Pressable>
            </Link>
            <Link href="/doctor" asChild>
              <Pressable style={styles.dashboardLink}>
                <Ionicons name="medical" size={20} color={colors.success.main} />
                <Text style={styles.dashboardLinkText}>Doctor</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
              </Pressable>
            </Link>
            <Link href="/therapist" asChild>
              <Pressable style={styles.dashboardLink}>
                <Ionicons name="heart" size={20} color={colors.error.main} />
                <Text style={styles.dashboardLinkText}>Therapist</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  viewAll: {
    ...typography.body2,
    color: colors.primary.main,
    fontWeight: '600',
  },
  statsGrid: {
    gap: spacing.md,
  },
  statItem: {
    marginBottom: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyStateCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  emptyStateTitle: {
    ...typography.body1,
    color: colors.text.secondary,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateText: {
    ...typography.body2,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  dashboardLinks: {
    gap: spacing.sm,
  },
  dashboardLink: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  dashboardLinkText: {
    ...typography.body1,
    color: colors.text.primary,
    flex: 1,
    fontWeight: '500',
  },
});
