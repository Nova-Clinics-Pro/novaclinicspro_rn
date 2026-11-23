/**
 * Clinic Admin Dashboard
 * Main dashboard for clinic administrators
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { DashboardHeader } from '../../core/components/DashboardHeader';
import { isClinicOwner } from '../../features/auth/domain/entities/auth.entity';
import { confirmLogout } from '../../features/auth/presentation/utils/confirmLogout';
import { StatCard } from '../../core/components/StatCard';
import { QuickActionButton } from '../../core/components/QuickActionButton';
import { useClinicTheme, type ClinicTheme } from '../../core/theme/useClinicTheme';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { useAuth } from '../../features/auth/presentation/hooks/useAuth';
import { useInventoryItemsListQuery, useInventoryAlertsListQuery } from '../../features/inventory/data/repositories/inventory.repository.impl';
import { useDailyFinanceSummaryQuery, useSubscriptionSummaryQuery } from '../../features/billing/data/repositories/billing.repository.impl';
import { useTreatmentOrdersQuery } from '../../features/treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import { useNotificationBadgeCount } from '../../features/notifications/presentation/hooks/useNotificationBadgeCount';
import { formatInrCurrency } from '../../core/utils/currency';
import { hasTranslation, t } from '../../core/localization';
import { useStaffListQuery } from '../../features/staff/data/repositories/staff.repository.impl';
import { mayOpenDashboard, resolveDashboardRoute } from '../../features/auth/domain/dashboardRoute';
import { useAppointmentsByDateQuery } from '../../features/appointments/data/repositories/appointments.repository.impl';
import { toISODateString } from '../../features/appointments/domain/helpers';
import { ClinicFeedbackSummarySection } from '../../features/feedback';
import { useOnboardingStatusQuery } from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import { useFeatures, hasTreatmentSheets, isTherapyClinic } from '../../core/hooks/useFeatures';

export default function ClinicAdminDashboard() {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { logout, currentUser, isAuthenticated } = useAuth();
  // A user whose role belongs on another dashboard is redirected away by the guard below. Until that happens (and for
  // good if they have no dashboard) this screen must not fetch clinic data they are not allowed to read: every query
  // here is enabled only with a tenant id, so withhold it from users who do not belong on this dashboard.
  const belongsHere = !!currentUser && (currentUser.isOrgAdmin || mayOpenDashboard(currentUser.roles, '/clinic-admin'));
  const tenantId = belongsHere ? currentUser?.tenantId || '' : '';
  const notificationCount = useNotificationBadgeCount();

  const clinicName = currentUser?.clinicName || t('clinicAdmin.dashboard.fallbackClinicName');
  const displayName = currentUser?.fullName || currentUser?.email || t('clinicAdmin.dashboard.fallbackUserName');
  const { width } = useWindowDimensions();
  
  // Determine if we're on mobile (< 768px) or web
  const isMobile = width < 768;
  const features = useFeatures();
  const therapyClinic = isTherapyClinic(features);
  const treatmentSheetsEnabled = hasTreatmentSheets(features);

  // Route guard - only allow clinic owner/admin, receptionist, and tenant_admin roles
  React.useEffect(() => {
    if (currentUser && currentUser.roles && currentUser.roles.length > 0) {
      // The same authority the home route uses, so the two can never disagree and bounce the user between them.
      if (!mayOpenDashboard(currentUser.roles, '/clinic-admin') && !currentUser.isOrgAdmin) {
        // Another dashboard, or (no dashboard for these roles) the home route, which explains it without redirecting.
        router.replace(resolveDashboardRoute(currentUser.roles) ?? '/');
      }
    }
  }, [currentUser, router]);

  // Fetch inventory data for dashboard stats
  const { data: inventoryData, isLoading: inventoryLoading } = useInventoryItemsListQuery(
    tenantId,
    { limit: 100 },
    { enabled: !!tenantId }
  );

  const { data: alertsData, isLoading: alertsLoading } = useInventoryAlertsListQuery(
    tenantId,
    { is_acknowledged: false, limit: 50 },
    { enabled: !!tenantId }
  );

  // Calculate inventory stats
  const inventoryItems = inventoryData?.items || [];
  const totalItems = inventoryData?.total || 0;
  const lowStockItems = inventoryItems.filter((item) => {
    const stock = parseFloat(item.current_stock) || 0;
    return stock <= item.reorder_point;
  });
  const lowStockCount = lowStockItems.length;
  
  // Calculate alerts by type
  const alerts = alertsData?.items || [];
  const totalAlertCount = alerts.length;

  // Fetch billing summary for dashboard
  const { data: billingSummary, isLoading: billingLoading } = useSubscriptionSummaryQuery(
    tenantId,
    { enabled: !!tenantId }
  );

  // Today's revenue: what the clinic collected today (clinic time), from the server, not computed here
  const { data: dailySummary, isLoading: revenueLoading, isError: revenueError } = useDailyFinanceSummaryQuery(
    tenantId,
    undefined,
    { enabled: !!tenantId }
  );

  // Fetch pending treatment orders count for the scheduling widget
  const { data: pendingOrdersData, refetch: refetchPendingOrders } = useTreatmentOrdersQuery(
    tenantId,
    { state: 'ORDERED', limit: 1 },
    { enabled: !!tenantId && treatmentSheetsEnabled }
  );

  // Fetch staff data for Staff Status section
  const { data: staffData, isLoading: staffLoading } = useStaffListQuery(
    tenantId,
    { limit: 10, is_active: true },
    { enabled: !!tenantId }
  );
  
  // Today's appointments: the same query (and day definition) the Appointments screen uses for its daily summary.
  const todayDate = toISODateString(new Date());
  const {
    data: todaysAppointments,
    isLoading: appointmentsLoading,
    isError: appointmentsError,
  } = useAppointmentsByDateQuery(tenantId, todayDate, { enabled: !!tenantId });
  const totalAppointmentsToday = todaysAppointments?.summary?.total ?? todaysAppointments?.appointments?.length ?? 0;

  // Get staff for display (up to 3)
  const staffMembers = staffData?.items?.slice(0, 3) || [];
  const activeStaffCount = staffData?.total || 0;

  // Fetch onboarding status to check if setup is complete
  const { data: onboardingStatus, refetch: refetchOnboardingStatus } = useOnboardingStatusQuery(
    tenantId,
    { enabled: !!tenantId }
  );

  // Refetch onboarding status when screen comes into focus.
  // IMPORTANT: refetch() bypasses each query's `enabled` guard — it always
  // dispatches the request regardless of auth state. Without the
  // isAuthenticated check, a focus event firing during/after logout (the
  // screen can still be mounted briefly while the navigation transition
  // settles) fires an authenticated request with no JWT, producing a
  // 401 "Authorization header required" right after logout.
  useFocusEffect(
    React.useCallback(() => {
      if (tenantId && isAuthenticated) {
        refetchOnboardingStatus();
        if (treatmentSheetsEnabled) {
          refetchPendingOrders();
        }
      }
    }, [tenantId, isAuthenticated, treatmentSheetsEnabled, refetchOnboardingStatus, refetchPendingOrders])
  );

  // Only show setup banner if onboarding is not complete AND user is still in onboarding status
  // Hide banner for active customers even if they have incomplete optional steps
  const showSetupBanner = onboardingStatus && 
    !onboardingStatus.is_ready_to_go_live && 
    currentUser?.applicationStatus === 'onboarding';

  const handleLogout = () => confirmLogout(t, logout);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title={currentUser && isClinicOwner(currentUser) ? t('dashboardTitles.clinicOwner') : t('dashboardTitles.clinicAdmin')}
        subtitle={clinicName}
        userName={displayName}
        notificationCount={notificationCount}
        onProfilePress={() => router.push('/profile')}
        onLogoutPress={handleLogout}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Clinic Preparation Banner - Show only if preparation is not complete */}
        {showSetupBanner && (
          <TouchableOpacity
            style={styles.setupBanner}
            onPress={() => {
              if (tenantId) {
                // Navigate to the preparation flow instead of individual steps
                console.log('[ClinicAdmin] Navigating to clinic preparation flow');
                router.push(`/onboarding/wizard-flow?tenantId=${tenantId}`);
              } else {
                Alert.alert('Error', 'Tenant ID not found. Please contact support.');
              }
            }}
          >
            <View style={styles.setupBannerContent}>
              <Ionicons name="rocket" size={32} color={theme.colors.primary.default} />
              <View style={styles.setupBannerText}>
                <Text style={styles.setupBannerTitle}>{t('onboarding.progressiveExperience.dashboard.finishPreparingClinic')}</Text>
                <Text style={styles.setupBannerSubtitle}>
                  {t('onboarding.progressiveExperience.dashboard.readinessStepsComplete', { completed: onboardingStatus?.completed_steps || 0, total: onboardingStatus?.total_steps || 0 })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.primary.default} />
            </View>
          </TouchableOpacity>
        )}

        {/* Clinic Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('clinicAdmin.dashboard.todaysOverview')}</Text>
          <View style={[styles.statsGrid, isMobile ? styles.statsGridMobile : styles.statsGridWeb]}>
            <View style={[styles.statItem, !isMobile && styles.statItemWeb]}>
              <StatCard
                title={t('clinicAdmin.dashboard.totalAppointments')}
                value={appointmentsLoading ? '...' : appointmentsError ? '—' : String(totalAppointmentsToday)}
                icon="calendar"
                color={theme.colors.primary.default}
              />
            </View>
            <View style={[styles.statItem, !isMobile && styles.statItemWeb]}>
              <StatCard
                title={t('clinicAdmin.dashboard.activeStaff')}
                value={staffLoading ? '...' : activeStaffCount.toString()}
                icon="people"
                color={theme.colors.feedback.success}
              />
            </View>
            <View style={[styles.statItem, !isMobile && styles.statItemWeb]}>
              <StatCard
                title={t('clinicDashboard.dailyRevenue')}
                value={revenueLoading ? '...' : revenueError ? '—' : formatInrCurrency(dailySummary?.collected_amount ?? 0)}
                icon="cash"
                color={theme.colors.feedback.warning}
              />
            </View>
            <View style={[styles.statItem, !isMobile && styles.statItemWeb]}>
              <StatCard
                title={t('clinicAdmin.dashboard.inventoryAlerts')}
                value={alertsLoading ? '...' : totalAlertCount.toString()}
                icon="warning"
                color={theme.colors.feedback.error}
                trend={lowStockCount > 0 ? { value: t('clinicAdmin.dashboard.lowStockTrend', { count: lowStockCount }), isPositive: false } : undefined}
              />
            </View>
          </View>
        </View>

        {/* Treatment Plans Pending Scheduling Banner */}
        {treatmentSheetsEnabled && (pendingOrdersData?.total ?? 0) > 0 && (
          <TouchableOpacity
            style={[styles.pendingOrdersBanner, { backgroundColor: theme.colors.feedback.info + '12', borderColor: theme.colors.feedback.info + '40' }]}
            onPress={() => router.push('/clinic-admin/treatment-sheets/orders' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.pendingOrdersIcon, { backgroundColor: theme.colors.feedback.info + '20' }]}>
              <Ionicons name="calendar-number" size={22} color={theme.colors.feedback.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pendingOrdersTitle, { color: theme.colors.feedback.info }]}>
                {t(pendingOrdersData!.total === 1 ? 'clinicAdmin.dashboard.plansToScheduleOne' : 'clinicAdmin.dashboard.plansToScheduleMany', { count: pendingOrdersData!.total })}
              </Text>
              <Text style={[styles.pendingOrdersSubtitle, { color: theme.colors.text.secondary }]}>
                {t('clinicAdmin.dashboard.plansToScheduleHint')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.feedback.info} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('clinicAdmin.dashboard.quickActions')}</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              icon="people"
              label={t('navigation.staff')}
              href="/clinic-admin/staff"
              color={theme.colors.primary.default}
            />
            <QuickActionButton
              icon="person"
              label={t('navigation.clients')}
              href="/clinic-admin/clients"
              color={theme.colors.feedback.success}
            />
            <QuickActionButton
              icon="calendar"
              label={t('navigation.appointments')}
              href="/clinic-admin/appointments"
              color={theme.colors.secondary.default}
            />
            <QuickActionButton
              icon="time"
              label={t('clinicAdmin.dashboard.leaveManagement')}
              href="/clinic-admin/staff/leave"
              color={theme.colors.feedback.warning}
            />
            {treatmentSheetsEnabled && (
              <QuickActionButton
                icon="calendar-number"
                label={t('clinicAdmin.dashboard.treatmentOrders')}
                href="/clinic-admin/treatment-sheets/orders"
                color={theme.colors.feedback.info}
              />
            )}
            <QuickActionButton
              icon="cube"
              label={t('navigation.inventory')}
              href="/clinic-admin/inventory"
              color={theme.colors.feedback.info}
            />
            <QuickActionButton
              icon="card"
              label={t('navigation.billing')}
              href="/clinic-admin/billing"
              color={theme.colors.feedback.success}
            />
            <QuickActionButton
              icon="document-text"
              label={t('navigation.reports')}
              href="/clinic-admin/reports"
              color={theme.colors.feedback.warning}
            />
            <QuickActionButton
              icon="cloud-upload"
              label={t('clinicAdmin.dashboard.bulkUpload')}
              href="/clinic-admin/bulk-upload"
              color={theme.colors.secondary.default}
            />
            <QuickActionButton
              icon="settings"
              label={t('navigation.settings')}
              href="/clinic-admin/settings"
              color={theme.colors.text.secondary}
            />
          </View>
        </View>

        {/* Clinic Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('clinicAdmin.dashboard.clinicSettings')}</Text>
            <Link href="/clinic-admin/settings" asChild>
              <Pressable>
                <Text style={styles.viewAll}>{t('common.viewAll')}</Text>
              </Pressable>
            </Link>
          </View>
          <Text style={styles.sectionSubtitle}>{t('clinicAdmin.dashboard.configureOperations')}</Text>
          
          <Link href="/clinic-admin/settings/operating-hours" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: theme.colors.primary.default + '15' }]}>
                <Ionicons name="time-outline" size={24} color={theme.colors.primary.default} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>{t('clinicAdmin.dashboard.operatingHours')}</Text>
                <Text style={styles.settingsDescription}>{t('clinicAdmin.dashboard.operatingHoursHint')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          </Link>

          <Link href="/clinic-admin/settings/rooms" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: theme.colors.feedback.info + '15' }]}>
                <Ionicons name="grid-outline" size={24} color={theme.colors.feedback.info} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>{t('clinicAdmin.dashboard.roomsAndResources')}</Text>
                <Text style={styles.settingsDescription}>{t(therapyClinic ? 'clinicAdmin.dashboard.roomsHintTherapy' : 'clinicAdmin.dashboard.roomsHintConsulting')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          </Link>

          <Link href="/clinic-admin/settings/treatments" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: theme.colors.feedback.warning + '15' }]}>
                <Ionicons name={therapyClinic ? 'leaf-outline' : 'medical-outline'} size={24} color={theme.colors.feedback.warning} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>{t(therapyClinic ? 'clinicAdmin.dashboard.treatmentsAndServices' : 'clinicAdmin.dashboard.services')}</Text>
                <Text style={styles.settingsDescription}>{t(therapyClinic ? 'clinicAdmin.dashboard.treatmentsHintTherapy' : 'clinicAdmin.dashboard.servicesHint')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          </Link>
        </View>

        {/* Staff Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('clinicAdmin.dashboard.staffStatus')}</Text>
            <Link href="/clinic-admin/staff" asChild>
              <Pressable>
                <Text style={styles.viewAll}>{t('common.viewAll')}</Text>
              </Pressable>
            </Link>
          </View>
          {staffLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary.default} />
              <Text style={styles.loadingText}>{t('clinicAdmin.dashboard.loadingStaff')}</Text>
            </View>
          ) : staffMembers.length > 0 ? (
            staffMembers.map((staff) => (
              <Link key={staff.id} href={`/clinic-admin/staff/${staff.id}`} asChild>
                <Pressable style={styles.staffCard}>
                  <View style={styles.staffInfo}>
                    <View
                      style={[
                        styles.staffAvatar,
                        {
                          backgroundColor: staff.is_active
                            ? theme.colors.feedback.success + '20'
                            : theme.colors.feedback.warning + '20',
                        },
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={24}
                        color={staff.is_active ? theme.colors.feedback.success : theme.colors.feedback.warning}
                      />
                    </View>
                    <View style={styles.staffDetails}>
                      <Text style={styles.staffName}>{staff.full_name}</Text>
                      <Text style={styles.staffRole}>
                        {staff.staff_type ? (hasTranslation(`roles.names.${staff.staff_type}`) ? t(`roles.names.${staff.staff_type}`) : staff.staff_type.charAt(0).toUpperCase() + staff.staff_type.slice(1)) : t('common.staff')}
                      </Text>
                      <Text style={styles.staffAppointments}>{staff.email || t('clinicAdmin.dashboard.noEmail')}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusIndicator,
                      {
                        backgroundColor: staff.is_active
                          ? theme.colors.feedback.success + '20'
                          : theme.colors.feedback.warning + '20',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: staff.is_active
                            ? theme.colors.feedback.success
                            : theme.colors.feedback.warning,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: staff.is_active
                            ? theme.colors.feedback.success
                            : theme.colors.feedback.warning,
                        },
                      ]}
                    >
                      {staff.is_active ? t('common.active') : t('common.inactive')}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            ))
          ) : (
            <View style={styles.noAlertsCard}>
              <Ionicons name="people-outline" size={24} color={theme.colors.text.secondary} />
              <Text style={styles.noAlertsText}>{t('clinicAdmin.dashboard.noStaff')}</Text>
            </View>
          )}
        </View>

        {/* Inventory Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('clinicAdmin.dashboard.lowStockAlerts')}</Text>
            <Link href="/clinic-admin/inventory/alerts" asChild>
              <Pressable>
                <Text style={styles.viewAll}>{t('common.viewAll')}</Text>
              </Pressable>
            </Link>
          </View>
          {alertsLoading || inventoryLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary.default} />
              <Text style={styles.loadingText}>{t('clinicAdmin.dashboard.loadingAlerts')}</Text>
            </View>
          ) : lowStockItems.length > 0 ? (
            lowStockItems.slice(0, 3).map((item) => {
              const stock = parseFloat(item.current_stock) || 0;
              const isCritical = stock <= item.reorder_point * 0.5;
              return (
                <Link key={item.id} href={`/clinic-admin/inventory/${item.id}`} asChild>
                  <Pressable style={styles.inventoryCard}>
                    <View style={styles.inventoryInfo}>
                      <Ionicons
                        name={isCritical ? 'warning' : 'cube'}
                        size={20}
                        color={isCritical ? theme.colors.feedback.error : theme.colors.feedback.warning}
                      />
                      <View style={styles.inventoryDetails}>
                        <Text style={styles.inventoryName}>{item.name}</Text>
                        <Text style={styles.inventoryStock}>
                          {stock} {item.unit || 'units'}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.levelBadge,
                        {
                          backgroundColor: isCritical
                            ? theme.colors.feedback.error + '20'
                            : theme.colors.feedback.warning + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelText,
                          {
                            color: isCritical ? theme.colors.feedback.error : theme.colors.feedback.warning,
                          },
                        ]}
                      >
                        {isCritical ? t('clinicAdmin.dashboard.critical') : t('clinicAdmin.dashboard.low')}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              );
            })
          ) : (
            <View style={styles.noAlertsCard}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.feedback.success} />
              <Text style={styles.noAlertsText}>{t('clinicAdmin.dashboard.allStockHealthy')}</Text>
            </View>
          )}
          {lowStockItems.length > 3 && (
            <Link href="/clinic-admin/inventory/alerts" asChild>
              <Pressable style={styles.moreAlertsButton}>
                <Text style={styles.moreAlertsText}>
                  {t('clinicAdmin.dashboard.moreAlerts', { count: lowStockItems.length - 3 })}
                </Text>
              </Pressable>
            </Link>
          )}
        </View>

        {/* Inventory Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('clinicAdmin.dashboard.inventoryManagement')}</Text>
          <Text style={styles.sectionSubtitle}>{t('clinicAdmin.dashboard.manageStock')}</Text>
          
          <Link href="/clinic-admin/inventory" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: theme.colors.primary.default + '15' }]}>
                <Ionicons name="cube-outline" size={24} color={theme.colors.primary.default} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>{t('clinicAdmin.dashboard.inventoryItems')}</Text>
                <Text style={styles.settingsDescription}>
                  {inventoryLoading ? t('common.loading') : t('clinicAdmin.dashboard.itemsInStock', { count: totalItems })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          </Link>

          <Link href="/clinic-admin/inventory/alerts" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: theme.colors.feedback.warning + '15' }]}>
                <Ionicons name="notifications-outline" size={24} color={theme.colors.feedback.warning} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>{t('clinicAdmin.dashboard.stockAlerts')}</Text>
                <Text style={styles.settingsDescription}>
                  {alertsLoading ? t('common.loading') : t('clinicAdmin.dashboard.activeAlerts', { count: totalAlertCount })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          </Link>
        </View>

        {/* Billing & Finance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('clinicAdmin.dashboard.billingAndFinance')}</Text>
            <Link href="/clinic-admin/billing" asChild>
              <Pressable>
                <Text style={styles.viewAll}>{t('common.viewAll')}</Text>
              </Pressable>
            </Link>
          </View>
          <Text style={styles.sectionSubtitle}>{t('clinicAdmin.dashboard.manageInvoices')}</Text>
          
          {/* Billing Summary Card */}
          <View style={styles.billingSummaryCard}>
            <View style={styles.billingSummaryHeader}>
              <View style={[styles.settingsIcon, { backgroundColor: theme.colors.feedback.success + '15' }]}>
                <Ionicons name="wallet" size={24} color={theme.colors.feedback.success} />
              </View>
              <View style={styles.billingSummaryInfo}>
                <Text style={styles.billingSummaryLabel}>{t('clinicAdmin.dashboard.outstandingBalance')}</Text>
                <Text style={[
                  styles.billingSummaryValue,
                  billingSummary && billingSummary.outstandingBalance > 0 && { color: theme.colors.feedback.warning }
                ]}>
                  {billingLoading 
                    ? '...' 
                    : formatInrCurrency(billingSummary?.outstandingBalance || 0)
                  }
                </Text>
              </View>
            </View>
            {billingSummary && billingSummary.unpaidInvoices > 0 && (
              <Text style={styles.billingSummarySubtext}>
                {t(billingSummary.unpaidInvoices === 1 ? 'clinicAdmin.dashboard.unpaidInvoiceOne' : 'clinicAdmin.dashboard.unpaidInvoiceMany', { count: billingSummary.unpaidInvoices })}
              </Text>
            )}
          </View>

          <Link href="/clinic-admin/billing/invoices" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: theme.colors.primary.default + '15' }]}>
                <Ionicons name="document-text-outline" size={24} color={theme.colors.primary.default} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>{t('clinicAdmin.dashboard.invoices')}</Text>
                <Text style={styles.settingsDescription}>
                  {billingLoading 
                    ? t('common.loading') 
                    : t('clinicAdmin.dashboard.totalInvoices', { count: billingSummary?.totalInvoices || 0 })
                  }
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          </Link>

          <Link href="/clinic-admin/billing/payments" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: theme.colors.feedback.success + '15' }]}>
                <Ionicons name="card-outline" size={24} color={theme.colors.feedback.success} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>{t('clinicAdmin.dashboard.payments')}</Text>
                <Text style={styles.settingsDescription}>{t('clinicAdmin.dashboard.viewPaymentHistory')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          </Link>
        </View>

        {/* Patient Feedback Summary */}
        {!!tenantId && (
          <View style={styles.section}>
            <ClinicFeedbackSummarySection
              tenantId={tenantId}
              onStaffPress={(staffId, staffType) => {
                // @ts-ignore - Route exists but TypeScript types not auto-generated yet
                router.push(`/clinic-admin/feedback?staffId=${staffId}&staffType=${staffType}`);
              }}
              testID="clinic-feedback-summary"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
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
    color: theme.colors.text.primary,
    marginBottom: spacing.md,
  },
  viewAll: {
    ...typography.body2,
    color: theme.colors.primary.default,
    fontWeight: '600',
  },
  statsGrid: {
    gap: spacing.md,
  },
  statsGridMobile: {
    flexDirection: 'column',
  },
  statsGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    marginBottom: spacing.sm,
  },
  statItemWeb: {
    width: '24%',
    minWidth: 180,
    marginRight: '1%',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pendingOrdersBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pendingOrdersIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingOrdersTitle: {
    ...typography.body1,
    fontWeight: '700',
  },
  pendingOrdersSubtitle: {
    ...typography.caption,
  },
  staffCard: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  staffInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    ...typography.body1,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  staffRole: {
    ...typography.body2,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  staffAppointments: {
    ...typography.caption,
    color: theme.colors.text.secondary,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  inventoryCard: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  inventoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  inventoryDetails: {
    flex: 1,
  },
  inventoryName: {
    ...typography.body1,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  inventoryStock: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelText: {
    ...typography.caption,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
  noAlertsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: theme.colors.feedback.success + '10',
    borderRadius: 12,
  },
  noAlertsText: {
    ...typography.body2,
    color: theme.colors.feedback.success,
    fontWeight: '600',
  },
  moreAlertsButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  moreAlertsText: {
    ...typography.body2,
    color: theme.colors.primary.default,
    fontWeight: '600',
  },
  dashboardLinks: {
    gap: spacing.sm,
  },
  dashboardLink: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  dashboardLinkText: {
    ...typography.body1,
    color: theme.colors.text.primary,
    flex: 1,
    fontWeight: '500',
  },
  sectionSubtitle: {
    ...typography.body2,
    color: theme.colors.text.secondary,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  settingsCard: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  settingsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingsInfo: {
    flex: 1,
  },
  settingsTitle: {
    ...typography.body1,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingsDescription: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
  billingSummaryCard: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  billingSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billingSummaryInfo: {
    flex: 1,
  },
  billingSummaryLabel: {
    ...typography.caption,
    color: theme.colors.text.secondary,
  },
  billingSummaryValue: {
    ...typography.h5,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  billingSummarySubtext: {
    ...typography.caption,
    color: theme.colors.feedback.warning,
    marginTop: spacing.xs,
    marginLeft: 48 + spacing.md,
  },
  setupBanner: {
    backgroundColor: theme.colors.primary.default + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary.default,
  },
  setupBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  setupBannerText: {
    flex: 1,
  },
  setupBannerTitle: {
    ...typography.h6,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  setupBannerSubtitle: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
});
