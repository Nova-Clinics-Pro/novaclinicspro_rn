/**
 * Owner Dashboard Screen
 * Portfolio view for clinic owners with multiple clinics
 * Shows high-level metrics and navigation to individual clinics
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { useAuth } from '../../features/auth/presentation/hooks/useAuth';
import { useSelectedClinic } from '../../features/auth/presentation/providers/auth.store';
import { MetricStatCard, OwnerClinicCard } from '../../features/owner-dashboard/presentation/components';
import {
  createPortfolioSummaryFromClinics,
  createClinicSummary,
} from '../../features/owner-dashboard/domain/entities/owner-dashboard.entity';
import type { OwnerClinicSummary } from '../../features/owner-dashboard/domain/entities/owner-dashboard.entity';

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const { currentUser, isLoading, logout } = useAuth();
  const { setSelectedClinic } = useSelectedClinic();
  const [refreshing, setRefreshing] = React.useState(false);

  // Get owned clinics from auth state
  const ownedClinics = currentUser?.ownedClinics || [];
  
  // Create portfolio summary based on owned clinics count
  const portfolioSummary = createPortfolioSummaryFromClinics(ownedClinics.length);
  
  // Map owned clinics to clinic summaries
  const clinicSummaries: OwnerClinicSummary[] = ownedClinics.map(clinic =>
    createClinicSummary(clinic)
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    // In future, refresh auth/me to get updated clinic list
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleOpenClinicDashboard = (tenantId: string) => {
    setSelectedClinic(tenantId);
    router.push('/clinic-admin');
  };

  const handleManageStaff = (tenantId: string) => {
    setSelectedClinic(tenantId);
    router.push('/clinic-admin/staff');
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        await logout();
      }
    } else {
      await logout();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
          <Text style={styles.errorTitle}>Not Authenticated</Text>
          <Text style={styles.errorMessage}>Please log in to view your dashboard.</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace('/login')}
            testID="owner-login-button"
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {currentUser.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.headerTitle}>{currentUser.fullName}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/profile')}
            testID="owner-profile-button"
          >
            <Ionicons name="person-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleLogout}
            testID="owner-logout-button"
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error.main} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Portfolio Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <MetricStatCard
                label="Total Clinics"
                metric={portfolioSummary.totalClinics}
                icon="medical"
                iconColor={colors.primary.main}
                testID="metric-total-clinics"
              />
            </View>
            <View style={styles.metricItem}>
              <MetricStatCard
                label="Total Staff"
                metric={portfolioSummary.totalActiveStaff}
                icon="people"
                iconColor={colors.success.main}
                testID="metric-total-staff"
              />
            </View>
            <View style={styles.metricItem}>
              <MetricStatCard
                label="Today's Appointments"
                metric={portfolioSummary.appointmentsToday}
                icon="calendar"
                iconColor={colors.info.main}
                testID="metric-appointments-today"
              />
            </View>
            <View style={styles.metricItem}>
              <MetricStatCard
                label="This Month's Revenue"
                metric={portfolioSummary.revenueThisMonth}
                icon="cash"
                iconColor={colors.warning.main}
                format="currency"
                testID="metric-revenue"
              />
            </View>
          </View>
        </View>

        {/* My Clinics Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Clinics</Text>
            <TouchableOpacity
              style={styles.addClinicButton}
              onPress={() => router.push('/owner/add-clinic' as any)}
              testID="add-clinic-button"
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary.main} />
              <Text style={styles.addClinicText}>Add Clinic</Text>
            </TouchableOpacity>
          </View>

          {clinicSummaries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyStateTitle}>No Clinics Found</Text>
              <Text style={styles.emptyStateMessage}>
                You don&apos;t have any clinics yet. Add your first clinic to get started.
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push('/owner/add-clinic' as any)}
                testID="empty-add-clinic-button"
              >
                <Ionicons name="add" size={20} color={colors.common.white} />
                <Text style={styles.emptyStateButtonText}>Add Your First Clinic</Text>
              </TouchableOpacity>
            </View>
          ) : (
            clinicSummaries.map((clinic) => (
              <OwnerClinicCard
                key={clinic.tenantId}
                clinic={clinic}
                onOpenDashboard={() => handleOpenClinicDashboard(clinic.tenantId)}
                onManageStaff={() => handleManageStaff(clinic.tenantId)}
                testID={`clinic-card-${clinic.tenantId}`}
              />
            ))
          )}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <Link href="/profile" asChild>
              <TouchableOpacity style={styles.quickActionCard} testID="quick-action-profile">
                <View style={[styles.quickActionIcon, { backgroundColor: colors.primary[50] }]}>
                  <Ionicons name="person" size={24} color={colors.primary.main} />
                </View>
                <Text style={styles.quickActionLabel}>My Profile</Text>
              </TouchableOpacity>
            </Link>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/owner/add-clinic' as any)}
              testID="quick-action-add-clinic"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.success[50] }]}>
                <Ionicons name="add-circle" size={24} color={colors.success.main} />
              </View>
              <Text style={styles.quickActionLabel}>Add Clinic</Text>
            </TouchableOpacity>
            <Link href="/notifications" asChild>
              <TouchableOpacity style={styles.quickActionCard} testID="quick-action-notifications">
                <View style={[styles.quickActionIcon, { backgroundColor: colors.info.main + '15' }]}>
                  <Ionicons name="notifications" size={24} color={colors.info.main} />
                </View>
                <Text style={styles.quickActionLabel}>Notifications</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/localization" asChild>
              <TouchableOpacity style={styles.quickActionCard} testID="quick-action-settings">
                <View style={[styles.quickActionIcon, { backgroundColor: colors.grey[100] }]}>
                  <Ionicons name="settings" size={24} color={colors.text.secondary} />
                </View>
                <Text style={styles.quickActionLabel}>Settings</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <View style={styles.helpCard}>
            <View style={styles.helpIconContainer}>
              <Ionicons name="help-circle" size={32} color={colors.info.main} />
            </View>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpDescription}>
                Access our help center for guides, tutorials, and support resources.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorMessage: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  loginButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h5,
    color: colors.common.white,
    fontWeight: '600',
  },
  headerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  welcomeText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.grey[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
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
  addClinicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  addClinicText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricItem: {
    width: '48%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background.default,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptyStateMessage: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info.main + '10',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  helpIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.info.main + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    ...typography.subtitle1,
    color: colors.info.dark,
    fontWeight: '600',
  },
  helpDescription: {
    ...typography.caption,
    color: colors.info.main,
    marginTop: 2,
  },
});
