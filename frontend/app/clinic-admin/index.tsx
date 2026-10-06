/**
 * Clinic Admin Dashboard
 * Main dashboard for clinic administrators
 */

import React from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { DashboardHeader } from '../../core/components/DashboardHeader';
import { StatCard } from '../../core/components/StatCard';
import { QuickActionButton } from '../../core/components/QuickActionButton';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { useAuth } from '../../features/auth/presentation/hooks/useAuth';
import { useInventoryItemsListQuery, useInventoryAlertsListQuery } from '../../features/inventory/data/repositories/inventory.repository.impl';
import { useSubscriptionSummaryQuery } from '../../features/billing/data/repositories/billing.repository.impl';
import { useTreatmentOrdersQuery } from '../../features/treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import { useNotificationBadgeCount } from '../../features/notifications/presentation/hooks/useNotificationBadgeCount';
import { formatInrCurrency } from '../../core/utils/currency';
import { t, ErrorTokens } from '../../core/localization';
import { useStaffListQuery } from '../../features/staff/data/repositories/staff.repository.impl';
import { ClinicFeedbackSummarySection } from '../../features/feedback';
import { useOnboardingStatusQuery } from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import { useFeatures, hasTreatmentSheets, isTherapyClinic } from '../../core/hooks/useFeatures';

export default function ClinicAdminDashboard() {
  const router = useRouter();
  const { logout, currentUser, isAuthenticated } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const notificationCount = useNotificationBadgeCount();

  const clinicName = currentUser?.clinicName || 'My Clinic';
  const displayName = currentUser?.fullName || currentUser?.email || 'Admin';
  const { width } = useWindowDimensions();
  
  // Determine if we're on mobile (< 768px) or web
  const isMobile = width < 768;
  const features = useFeatures();
  const therapyClinic = isTherapyClinic(features);
  const treatmentSheetsEnabled = hasTreatmentSheets(features);

  // Route guard - only allow clinic owner/admin, receptionist, and tenant_admin roles
  React.useEffect(() => {
    if (currentUser && currentUser.roles && currentUser.roles.length > 0) {
      const userRole = currentUser.roles[0]?.toLowerCase() || '';
      console.log('[ClinicAdmin] Route guard checking role:', userRole);
      
      // Allow all owner/admin variants that should land in clinic-admin.
      const allowedRoles = ['clinic owner', 'clinic_owner', 'clinic admin', 'clinic_admin', 'receptionist', 'tenant admin', 'tenant_admin'];
      
      if (!allowedRoles.includes(userRole) && !currentUser.isOrgAdmin) {
        console.log('[ClinicAdmin] Access denied, redirecting to appropriate dashboard');
        
        // Redirect to appropriate dashboard based on role
        if (userRole === 'doctor') {
          router.replace('/doctor');
        } else if (userRole === 'therapist') {
          router.replace('/therapist');
        } else {
          // Unknown role, redirect to index for proper routing
          router.replace('/');
        }
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
        title="Clinic Admin Dashboard"
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
              <Ionicons name="rocket" size={32} color={colors.primary.main} />
              <View style={styles.setupBannerText}>
                <Text style={styles.setupBannerTitle}>{t('onboarding.progressiveExperience.dashboard.finishPreparingClinic')}</Text>
                <Text style={styles.setupBannerSubtitle}>
                  {t('onboarding.progressiveExperience.dashboard.readinessStepsComplete', { completed: onboardingStatus?.completed_steps || 0, total: onboardingStatus?.total_steps || 0 })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.primary.main} />
            </View>
          </TouchableOpacity>
        )}

        {/* Clinic Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Overview</Text>
          <View style={[styles.statsGrid, isMobile ? styles.statsGridMobile : styles.statsGridWeb]}>
            <View style={[styles.statItem, !isMobile && styles.statItemWeb]}>
              <StatCard
                title="Total Appointments"
                value="0"
                icon="calendar"
                color={colors.primary.main}
              />
            </View>
            <View style={[styles.statItem, !isMobile && styles.statItemWeb]}>
              <StatCard
                title="Active Staff"
                value={staffLoading ? '...' : activeStaffCount.toString()}
                icon="people"
                color={colors.success.main}
              />
            </View>
            <View style={[styles.statItem, !isMobile && styles.statItemWeb]}>
              <StatCard
                title="Daily Revenue"
                value={formatInrCurrency(0)}
                icon="cash"
                color={colors.warning.main}
              />
            </View>
            <View style={[styles.statItem, !isMobile && styles.statItemWeb]}>
              <StatCard
                title="Inventory Alerts"
                value={alertsLoading ? '...' : totalAlertCount.toString()}
                icon="warning"
                color={colors.error.main}
                trend={lowStockCount > 0 ? { value: `${lowStockCount} low stock`, isPositive: false } : undefined}
              />
            </View>
          </View>
        </View>

        {/* Treatment Plans Pending Scheduling Banner */}
        {treatmentSheetsEnabled && (pendingOrdersData?.total ?? 0) > 0 && (
          <TouchableOpacity
            style={[styles.pendingOrdersBanner, { backgroundColor: colors.info.main + '12', borderColor: colors.info.main + '40' }]}
            onPress={() => router.push('/clinic-admin/treatment-sheets/orders' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.pendingOrdersIcon, { backgroundColor: colors.info.main + '20' }]}>
              <Ionicons name="calendar-number" size={22} color={colors.info.main} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pendingOrdersTitle, { color: colors.info.main }]}>
                {pendingOrdersData!.total} Treatment Plan{pendingOrdersData!.total !== 1 ? 's' : ''} to Schedule
              </Text>
              <Text style={[styles.pendingOrdersSubtitle, { color: colors.text.secondary }]}>
                Tap to open the scheduling worklist
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.info.main} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              icon="people"
              label="Staff"
              href="/clinic-admin/staff"
              color={colors.primary.main}
            />
            <QuickActionButton
              icon="person"
              label="Clients"
              href="/clinic-admin/clients"
              color={colors.success.main}
            />
            <QuickActionButton
              icon="calendar"
              label="Appointments"
              href="/clinic-admin/appointments"
              color={colors.secondary.main}
            />
            <QuickActionButton
              icon="time"
              label="Leave Mgmt"
              href="/clinic-admin/staff/leave"
              color={colors.warning.main}
            />
            {treatmentSheetsEnabled && (
              <QuickActionButton
                icon="calendar-number"
                label="Tx Orders"
                href="/clinic-admin/treatment-sheets/orders"
                color={colors.info.main}
              />
            )}
            <QuickActionButton
              icon="cube"
              label="Inventory"
              href="/clinic-admin/inventory"
              color={colors.info.main}
            />
            <QuickActionButton
              icon="card"
              label="Billing"
              href="/clinic-admin/billing"
              color={colors.success.main}
            />
            <QuickActionButton
              icon="document-text"
              label="Reports"
              href="/clinic-admin/reports"
              color={colors.warning.main}
            />
            <QuickActionButton
              icon="cloud-upload"
              label="Bulk Upload"
              href="/clinic-admin/bulk-upload"
              color={colors.secondary.main}
            />
            <QuickActionButton
              icon="settings"
              label="Settings"
              href="/clinic-admin/settings"
              color={colors.text.secondary}
            />
          </View>
        </View>

        {/* Clinic Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Clinic Settings</Text>
            <Link href="/clinic-admin/settings" asChild>
              <Pressable>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </Link>
          </View>
          <Text style={styles.sectionSubtitle}>Configure your clinic operations</Text>
          
          <Link href="/clinic-admin/settings/operating-hours" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.primary.main + '15' }]}>
                <Ionicons name="time-outline" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>Operating Hours</Text>
                <Text style={styles.settingsDescription}>Set clinic open/close times</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </Pressable>
          </Link>

          <Link href="/clinic-admin/settings/rooms" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.info.main + '15' }]}>
                <Ionicons name="grid-outline" size={24} color={colors.info.main} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>Rooms & Resources</Text>
                <Text style={styles.settingsDescription}>{therapyClinic ? 'Manage therapy rooms' : 'Manage consulting rooms'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </Pressable>
          </Link>

          <Link href="/clinic-admin/settings/treatments" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.warning.main + '15' }]}>
                <Ionicons name={therapyClinic ? 'leaf-outline' : 'medical-outline'} size={24} color={colors.warning.main} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>{therapyClinic ? 'Treatments & Services' : 'Services'}</Text>
                <Text style={styles.settingsDescription}>{therapyClinic ? 'Configure Ayurvedic treatments' : 'Configure consultation services'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </Pressable>
          </Link>
        </View>

        {/* Staff Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Staff Status</Text>
            <Link href="/clinic-admin/staff" asChild>
              <Pressable>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </Link>
          </View>
          {staffLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary.main} />
              <Text style={styles.loadingText}>Loading staff...</Text>
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
                            ? colors.success.main + '20'
                            : colors.warning.main + '20',
                        },
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={24}
                        color={staff.is_active ? colors.success.main : colors.warning.main}
                      />
                    </View>
                    <View style={styles.staffDetails}>
                      <Text style={styles.staffName}>{staff.full_name}</Text>
                      <Text style={styles.staffRole}>
                        {staff.staff_type ? staff.staff_type.charAt(0).toUpperCase() + staff.staff_type.slice(1) : 'Staff'}
                      </Text>
                      <Text style={styles.staffAppointments}>{staff.email || 'No email'}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusIndicator,
                      {
                        backgroundColor: staff.is_active
                          ? colors.success.main + '20'
                          : colors.warning.main + '20',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: staff.is_active
                            ? colors.success.main
                            : colors.warning.main,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: staff.is_active
                            ? colors.success.main
                            : colors.warning.main,
                        },
                      ]}
                    >
                      {staff.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            ))
          ) : (
            <View style={styles.noAlertsCard}>
              <Ionicons name="people-outline" size={24} color={colors.text.secondary} />
              <Text style={styles.noAlertsText}>No staff members found</Text>
            </View>
          )}
        </View>

        {/* Inventory Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
            <Link href="/clinic-admin/inventory/alerts" asChild>
              <Pressable>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </Link>
          </View>
          {alertsLoading || inventoryLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary.main} />
              <Text style={styles.loadingText}>Loading alerts...</Text>
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
                        color={isCritical ? colors.error.main : colors.warning.main}
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
                            ? colors.error.main + '20'
                            : colors.warning.main + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelText,
                          {
                            color: isCritical ? colors.error.main : colors.warning.main,
                          },
                        ]}
                      >
                        {isCritical ? 'Critical' : 'Low'}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              );
            })
          ) : (
            <View style={styles.noAlertsCard}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success.main} />
              <Text style={styles.noAlertsText}>All stock levels healthy</Text>
            </View>
          )}
          {lowStockItems.length > 3 && (
            <Link href="/clinic-admin/inventory/alerts" asChild>
              <Pressable style={styles.moreAlertsButton}>
                <Text style={styles.moreAlertsText}>
                  +{lowStockItems.length - 3} more alerts
                </Text>
              </Pressable>
            </Link>
          )}
        </View>

        {/* Inventory Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory Management</Text>
          <Text style={styles.sectionSubtitle}>Manage stock & supplies</Text>
          
          <Link href="/clinic-admin/inventory" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.primary.main + '15' }]}>
                <Ionicons name="cube-outline" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>Inventory Items</Text>
                <Text style={styles.settingsDescription}>
                  {inventoryLoading ? 'Loading...' : `${totalItems} items in stock`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </Pressable>
          </Link>

          <Link href="/clinic-admin/inventory/alerts" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.warning.main + '15' }]}>
                <Ionicons name="notifications-outline" size={24} color={colors.warning.main} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>Stock Alerts</Text>
                <Text style={styles.settingsDescription}>
                  {alertsLoading ? 'Loading...' : `${totalAlertCount} active alerts`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </Pressable>
          </Link>
        </View>

        {/* Billing & Finance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Billing & Finance</Text>
            <Link href="/clinic-admin/billing" asChild>
              <Pressable>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </Link>
          </View>
          <Text style={styles.sectionSubtitle}>Manage invoices & payments</Text>
          
          {/* Billing Summary Card */}
          <View style={styles.billingSummaryCard}>
            <View style={styles.billingSummaryHeader}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.success.main + '15' }]}>
                <Ionicons name="wallet" size={24} color={colors.success.main} />
              </View>
              <View style={styles.billingSummaryInfo}>
                <Text style={styles.billingSummaryLabel}>Outstanding Balance</Text>
                <Text style={[
                  styles.billingSummaryValue,
                  billingSummary && billingSummary.outstandingBalance > 0 && { color: colors.warning.main }
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
                {billingSummary.unpaidInvoices} unpaid invoice{billingSummary.unpaidInvoices !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          <Link href="/clinic-admin/billing/invoices" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.primary.main + '15' }]}>
                <Ionicons name="document-text-outline" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>Invoices</Text>
                <Text style={styles.settingsDescription}>
                  {billingLoading 
                    ? 'Loading...' 
                    : `${billingSummary?.totalInvoices || 0} total invoices`
                  }
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </Pressable>
          </Link>

          <Link href="/clinic-admin/billing/payments" asChild>
            <Pressable style={styles.settingsCard}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.success.main + '15' }]}>
                <Ionicons name="card-outline" size={24} color={colors.success.main} />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>Payments</Text>
                <Text style={styles.settingsDescription}>View payment history</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </Pressable>
          </Link>
        </View>

        {/* Patient Feedback Summary */}
        {tenantId && (
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
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
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
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  staffRole: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  staffAppointments: {
    ...typography.caption,
    color: colors.text.secondary,
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
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
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
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  inventoryStock: {
    ...typography.body2,
    color: colors.text.secondary,
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
    color: colors.text.secondary,
  },
  noAlertsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: colors.success.main + '10',
    borderRadius: 12,
  },
  noAlertsText: {
    ...typography.body2,
    color: colors.success.main,
    fontWeight: '600',
  },
  moreAlertsButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  moreAlertsText: {
    ...typography.body2,
    color: colors.primary.main,
    fontWeight: '600',
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
  sectionSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  settingsCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
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
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingsDescription: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  billingSummaryCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
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
    color: colors.text.secondary,
  },
  billingSummaryValue: {
    ...typography.h5,
    fontWeight: '700',
    color: colors.text.primary,
  },
  billingSummarySubtext: {
    ...typography.caption,
    color: colors.warning.main,
    marginTop: spacing.xs,
    marginLeft: 48 + spacing.md,
  },
  setupBanner: {
    backgroundColor: colors.primary.main + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary.main,
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
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  setupBannerSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
  },
});
