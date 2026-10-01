/**
 * Doctor Dashboard Screen
 * Role-specific dashboard for doctors with KPI metrics from backend API
 * 
 * API Integration:
 * - GET /api/v1/clinic/{tenant_id}/staff/{staff_id}/kpis - Doctor KPI metrics
 * - GET /api/v1/clinic/{tenant_id}/staff/me/dashboard/doctor - Today's appointments
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Router } from 'expo-router';
import { DashboardHeader } from '../core/components/DashboardHeader';
import { DateStrip, toISODateLocal } from '../core/components/DateStrip';
import { colors } from '../core/theme/colors';
import { spacing } from '../core/theme/spacing';
import { typography } from '../core/theme/typography';
import { useAuth } from '../features/auth/presentation/hooks/useAuth';
import { t, ErrorTokens } from '../core/localization';
import { useDoctorDashboardDate } from '../features/staffDashboards/presentation/hooks/useDashboardDate';
import { filterAppointmentsByDate } from '../features/staffDashboards/domain/utils/filterAppointments';
import { useQuery } from '@tanstack/react-query';
import {
  useDoctorDashboardQuery,
  DashboardQuickActions,
  EmptyDashboardState,
  OnLeaveBanner,
  QuickAction,
} from '../features/staffDashboards';
import { AppointmentRow } from '../features/appointments/presentation/components/AppointmentRow';
import { StaffFeedbackSection } from '../features/feedback';
import {
  useDoctorKpisQuery,
  KpiPeriodSelector,
  KpiStatsGrid,
  TimeMetricsSection,
  type KPIPeriodType,
  mapConsultationsToCards,
  mapPatientsToCards,
  mapProductivityToCards,
  mapPeakHoursToBars,
  mapBusiestDaysToBars,
  formatDuration,
} from '../features/doctorDashboard';
import { usePendingDocumentationQuery } from '../features/treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import {
  getLifecycleStatusColor,
  getLifecycleStatusLabel,
} from '../features/treatmentSheets/data/models/treatmentOrders.dtos';
import {
  CaseResolverState,
  startConsultationWithGuard,
} from '../features/doctorDashboard/application/caseResolver';

// Phase 4 (R4) · T-E.1 (ADR-R4-02) — re-pointed to the backend's own
// lifecycle_status_label/lifecycle_status (T-C.2); this widget's own
// getPendingDocumentationStatusLabel (raw state/scheduling_status/
// documentation_status branching) is superseded, not recreated elsewhere.

export default function DoctorDashboard() {
  const router = useRouter();
  const { logout, currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const staffId = currentUser?.userId || ''; // Use user_id directly as staff_id

  // ============================================================
  // CASE RESOLVER STATE
  // ============================================================
  const [resolverState, setResolverState] = React.useState<CaseResolverState>({
    loadingAppointmentId: null,
    error: null,
  });

  /**
   * Handles "Start Consultation" tap for a given appointment card.
   * Guards against double-tap, queries for an active episode, and navigates accordingly.
   */
  const handleStartConsultation = React.useCallback(
    async (appointmentId: string, clientId: string) => {
      await startConsultationWithGuard({
        tenantId,
        appointmentId,
        clientId,
        router,
        loadingAppointmentId: resolverState.loadingAppointmentId,
        setState: setResolverState,
      });
    },
    [resolverState.loadingAppointmentId, tenantId, router]
  );

  // Shared date hook (reads/writes doctor-specific field in Zustand store)
  const { selectedDate, setSelectedDate, selectedDateStr } = useDoctorDashboardDate();

  // Route guard - only allow doctor role
  React.useEffect(() => {
    if (currentUser && currentUser.roles && currentUser.roles.length > 0) {
      const userRole = currentUser.roles[0]?.toLowerCase() || '';
      console.log('[Doctor] Route guard checking role:', userRole);
      
      // Allow: doctor only
      const allowedRoles = ['doctor'];
      
      if (!allowedRoles.includes(userRole) && !currentUser.isOrgAdmin) {
        console.log('[Doctor] Access denied, redirecting to appropriate dashboard');
        
        // Redirect to appropriate dashboard based on role
        if (userRole === 'therapist') {
          router.replace('/therapist');
        } else if (['clinic owner', 'clinic_owner', 'clinic admin', 'clinic_admin', 'receptionist', 'tenant admin', 'tenant_admin'].includes(userRole)) {
          router.replace('/clinic-admin');
        } else {
          // Unknown role, redirect to index for proper routing
          router.replace('/');
        }
      }
    }
  }, [currentUser, router]);

  // KPI period state
  const [kpiPeriod, setKpiPeriod] = useState<KPIPeriodType>('7d');
  const [customFromDate, setCustomFromDate] = useState<string>();
  const [customToDate, setCustomToDate] = useState<string>();

  // Fetch appointments using dashboard API (backend filters by logged-in user automatically)
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
    isRefetching: isDashboardRefetching,
  } = useDoctorDashboardQuery(
    tenantId,
    { date: selectedDateStr },
    {
      enabled: !!tenantId,
    }
  );

  // Debug logging for appointments and KPIs
  React.useEffect(() => {
    console.log('[DoctorDashboard] State:', {
      tenantId,
      staffId,
      currentUserUserId: currentUser?.userId,
      selectedDate: selectedDate.toDateString(),
      selectedDateStr,
      kpiPeriod,
      enabled: !!tenantId && !!staffId,
    });
  }, [tenantId, staffId, currentUser?.userId, selectedDate, selectedDateStr, kpiPeriod]);

  // Log dashboard data when it changes
  React.useEffect(() => {
    if (dashboardData) {
      console.log('[DoctorDashboard] Dashboard data received:', {
        appointmentsCount: dashboardData.appointments?.length || 0,
        onLeave: dashboardData.on_leave_today,
        firstAppointment: dashboardData.appointments?.[0],
        selectedDateStr,
      });
    }
  }, [dashboardData, selectedDateStr]);

  // Fetch KPI metrics from backend
  const {
    data: kpiData,
    isLoading: isKpiLoading,
    isError: isKpiError,
    error: kpiError,
    refetch: refetchKpis,
    isRefetching: isKpiRefetching,
  } = useDoctorKpisQuery(
    tenantId,
    staffId,
    {
      period: kpiPeriod,
      fromDate: customFromDate,
      toDate: customToDate,
    },
    {
      enabled: !!tenantId && !!staffId,
    }
  );

  // Extract doctor name from dashboard data or KPI data
  const doctorName = React.useMemo(() => {
    if (dashboardData?.appointments?.[0]?.staff_name) {
      return dashboardData.appointments[0].staff_name;
    }
    if (kpiData?.staff_name) {
      return kpiData.staff_name;
    }
    return 'Doctor';
  }, [dashboardData?.appointments, kpiData?.staff_name]);

  // Pending documentation widget — sheets in SCHEDULED/IN_PROGRESS with DRAFT docs
  const { data: pendingDocData } = usePendingDocumentationQuery(tenantId, {
    enabled: !!tenantId,
  });
  const pendingDocItems = pendingDocData?.items ?? [];

  // Log KPI data when it changes
  React.useEffect(() => {
    if (kpiData) {
      console.log('[DoctorDashboard] KPI Data received:', {
        consultations: kpiData.consultations,
        patients: kpiData.patients,
        productivity: kpiData.clinical_productivity,
        staffName: kpiData.staff_name,
      });
    }
  }, [kpiData]);

  // Handle period change
  const handlePeriodChange = useCallback(
    (period: KPIPeriodType, fromDate?: string, toDate?: string) => {
      setKpiPeriod(period);
      if (period === 'custom') {
        setCustomFromDate(fromDate);
        setCustomToDate(toDate);
      } else {
        setCustomFromDate(undefined);
        setCustomToDate(undefined);
      }
    },
    []
  );

  // Refresh all data
  const handleRefresh = useCallback(() => {
    refetchDashboard();
    refetchKpis();
  }, [refetchDashboard, refetchKpis]);

  // Filter appointments to only show those matching the selected date
  const filteredAppointments = useMemo(
    () => filterAppointmentsByDate(dashboardData?.appointments, selectedDateStr),
    [dashboardData?.appointments, selectedDateStr]
  );

  // Log filtered appointments
  React.useEffect(() => {
    if (dashboardData) {
      console.log('[DoctorDashboard] Filtered appointments:', {
        total: dashboardData.appointments?.length || 0,
        filtered: filteredAppointments.length,
        selectedDateStr,
      });
    }
  }, [dashboardData, filteredAppointments.length, selectedDateStr]);

  // Get unique client IDs from filtered appointments
  const uniqueClientIds = useMemo(() => {
    return [...new Set(filteredAppointments.map(apt => apt.client_id))];
  }, [filteredAppointments]);

  // Fetch episode counts for all unique clients
  // Use axios client to benefit from automatic token handling and interceptors
  const { data: episodeCountsData } = useQuery({
    queryKey: ['episodeCounts', tenantId, uniqueClientIds],
    queryFn: async () => {
      console.log('[DoctorDashboard] Fetching episode counts for clients:', uniqueClientIds);
      const counts: Record<string, number> = {};
      
      // Import axios client dynamically to avoid circular dependencies
      const { axiosClient } = await import('../core/api/axiosClient');
      
      // Fetch episodes for each client using axios (has token interceptors)
      await Promise.all(
        uniqueClientIds.map(async (clientId) => {
          try {
            const url = `/api/v1/clinic/${tenantId}/episodes?client_id=${clientId}&limit=1`;
            console.log('[DoctorDashboard] Fetching episodes for client:', clientId, 'URL:', url);
            
            const response = await axiosClient.get(url);
            
            console.log('[DoctorDashboard] Response status for client', clientId, ':', response.status);
            console.log('[DoctorDashboard] Episode data for client', clientId, ':', response.data);
            
            counts[clientId] = response.data.total || 0;
          } catch (error: any) {
            console.error(`[DoctorDashboard] Error fetching episode count for client ${clientId}:`, error?.response?.status, error?.response?.data || error?.message);
            counts[clientId] = 0;
          }
        })
      );
      
      console.log('[DoctorDashboard] Final episode counts:', counts);
      return counts;
    },
    enabled: !!tenantId && uniqueClientIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const episodeCountMap = episodeCountsData || {};

  // Debug log episode counts
  React.useEffect(() => {
    console.log('[DoctorDashboard] Episode counts data:', episodeCountsData);
    console.log('[DoctorDashboard] Episode count map:', episodeCountMap);
    console.log('[DoctorDashboard] Unique client IDs:', uniqueClientIds);
  }, [episodeCountsData, episodeCountMap, uniqueClientIds]);

  // Map KPI data to card format
  const kpiCards = useMemo(() => {
    if (!kpiData) return null;
    
    // Check if we have the required data
    const hasProductivity = kpiData.clinical_productivity && 
      typeof kpiData.clinical_productivity === 'object';
    const hasTimeMetrics = kpiData.time_metrics && 
      typeof kpiData.time_metrics === 'object';
    
    console.log('[DoctorDashboard] KPI data structure:', {
      hasConsultations: !!kpiData.consultations,
      hasPatients: !!kpiData.patients,
      hasProductivity,
      hasTimeMetrics,
      keys: Object.keys(kpiData),
    });
    
    return {
      consultations: mapConsultationsToCards(kpiData.consultations),
      patients: mapPatientsToCards(kpiData.patients),
      productivity: hasProductivity ? mapProductivityToCards(kpiData.clinical_productivity) : null,
      peakHours: hasTimeMetrics && kpiData.time_metrics.peak_hours ? 
        mapPeakHoursToBars(kpiData.time_metrics.peak_hours, 3) : [],
      busiestDays: hasTimeMetrics && kpiData.time_metrics.busiest_days ? 
        mapBusiestDaysToBars(kpiData.time_metrics.busiest_days, 3) : [],
      avgDuration: hasTimeMetrics && kpiData.time_metrics.avg_consultation_duration_minutes ? 
        formatDuration(kpiData.time_metrics.avg_consultation_duration_minutes) : null,
    };
  }, [kpiData]);

  // Quick actions
  const quickActions: QuickAction[] = useMemo(() => [
    {
      label: 'View Schedule',
      icon: 'calendar-outline',
      onPress: () => router.push('/clinic-admin/appointments'),
      color: colors.primary.main,
      variant: 'primary',
    },
    {
      label: 'View Patients',
      icon: 'people-outline',
      onPress: () => router.push('/clinic-admin/clients'),
      color: colors.success.main,
    },
    {
      label: 'Start Session',
      icon: 'play-circle-outline',
      onPress: () => {
        // T-D.2 (ADR-P1-04): delegates to the same canonical resolver as the
        // per-appointment "Start Consultation" button (handleStartConsultation
        // -> startConsultationWithGuard -> resolveCase), so every "Start" entry
        // point yields one behavior. Previously this only showed an Alert with
        // no confirm handler and never navigated (ED-004).
        const nextAppointment = dashboardData?.appointments?.find(
          (a) => ['scheduled', 'confirmed'].includes(a.status?.toLowerCase())
        );
        if (nextAppointment) {
          handleStartConsultation(nextAppointment.id, nextAppointment.client_id);
        } else {
          Alert.alert('No Upcoming', 'No upcoming appointments to start.');
        }
      },
      color: colors.info.main,
    },
  ], [dashboardData, router, handleStartConsultation]);

  // Clinical documents quick actions
  const clinicalActions: QuickAction[] = useMemo(() => [
    {
      label: 'Casesheets',
      icon: 'document-text-outline',
      onPress: () => {
        Alert.alert(
          'View Casesheets',
          'Select a patient first to view their casesheets.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Patients', onPress: () => router.push('/clinic-admin/clients') },
          ]
        );
      },
      color: colors.primary.main,
    },
    {
      label: 'Prescriptions',
      icon: 'medkit-outline',
      onPress: () => {
        Alert.alert(
          'View Prescriptions',
          'Select a patient first to view their prescriptions.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Patients', onPress: () => router.push('/clinic-admin/clients') },
          ]
        );
      },
      color: colors.success.main,
    },
  ], [router]);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to logout?')) {
        return;
      }
      void logout().catch(() => {
        window.alert('Failed to logout. Please try again.');
      });
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Get error message for KPI errors
  const getKpiErrorMessage = (error: any): { title: string; message: string } => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail || '';

    switch (status) {
      case 400:
        return {
          title: 'Invalid Request',
          message: detail || 'Invalid period or date range. Please try again.',
        };
      case 401:
        return {
          title: 'Session Expired',
          message: 'Please log in again to view your KPIs.',
        };
      case 403:
        return {
          title: 'Access Denied',
          message: 'You do not have permission to view these KPIs.',
        };
      case 404:
        return {
          title: 'Not Found',
          message: 'Staff profile not found. Please contact support.',
        };
      default:
        return {
          title: 'Error Loading KPIs',
          message: 'Could not load your performance metrics. Please try again.',
        };
    }
  };

  const renderContent = () => {
    // Loading state for dashboard
    if (isDashboardLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      );
    }

    // Error state for dashboard
    if (isDashboardError) {
      const axiosError = dashboardError as any;
      const status = axiosError?.response?.status;
      const errorDetail = axiosError?.response?.data?.detail || '';
      
      const isPermissionError = status === 403 || 
        errorDetail.toLowerCase().includes('permission') ||
        errorDetail.toLowerCase().includes('forbidden');
      
      const isAuthError = status === 401;
      
      return (
        <View style={styles.section}>
          <EmptyDashboardState
            variant="error"
            title={
              isPermissionError 
                ? t(ErrorTokens.dashboard.accessRestricted) 
                : isAuthError 
                ? 'Session Expired'
                : t('common.error')
            }
            message={
              isPermissionError
                ? t(ErrorTokens.auth.permissionDenied)
                : isAuthError
                ? t(ErrorTokens.auth.sessionExpired)
                : t(ErrorTokens.dashboard.loadFailed)
            }
            actionLabel={isPermissionError ? t('common.goBack') : isAuthError ? 'Login' : t('common.retry')}
            onActionPress={() => {
              if (isPermissionError) {
                router.back();
              } else if (isAuthError) {
                router.replace('/login');
              } else {
                refetchDashboard();
              }
            }}
          />
        </View>
      );
    }

    // Success state
    const appointments = dashboardData?.appointments || [];
    const onLeave = dashboardData?.on_leave_today;

    return (
      <>
        {/* On Leave Banner */}
        {onLeave && (
          <View style={styles.section}>
            <OnLeaveBanner />
          </View>
        )}

        {/* Date Selector */}
        <View style={styles.section}>
          <DateStrip
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </View>

        {/* Today's Appointments - Moved to top */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedDate.toDateString() === new Date().toDateString() 
                ? "Today's Appointments" 
                : `Appointments for ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </Text>
            <TouchableOpacity onPress={() => router.push('/clinic-admin/appointments')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {filteredAppointments.length === 0 ? (
            <EmptyDashboardState
              icon="calendar-outline"
              title="No Appointments"
              message={onLeave ? "You're on leave today." : `No appointments scheduled for ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`}
            />
          ) : (
            filteredAppointments.map((appointment) => {
              // Adapt DoctorAppointmentItem → AppointmentResponse shape for AppointmentRow
              const appointmentForList = {
                tenant_id: tenantId,
                room_id: appointment.room_name ?? null,
                treatment_id: null,
                is_active: true,
                created_at: '',
                appointment_type: null,
                series_id: null,
                therapist_ids: appointment.therapist_ids ?? [],
                ...appointment,
                staff_name: appointment.staff_name || doctorName,
              } as import('../features/appointments/data/models/appointments.dtos').AppointmentResponse;
              
              const hasCardError =
                resolverState.error?.appointmentId === appointment.id;

              return (
                <React.Fragment key={appointment.id}>
                  <AppointmentRow
                    variant="full"
                    appointment={appointmentForList}
                    onPress={undefined} // Remove navigation to detail page
                    showActions={true} // Enable quick actions
                    userRole="doctor"
                    onStatusUpdate={(appointmentId, newStatus) => {
                      console.log('[DoctorDashboard] Status update:', appointmentId, newStatus);
                      // TODO: Implement status update mutation
                    }}
                    onCancel={(appointmentId) => {
                      console.log('[DoctorDashboard] Cancel:', appointmentId);
                      // TODO: Implement cancel mutation
                    }}
                    onReschedule={(appointmentId) => {
                      console.log('[DoctorDashboard] Reschedule:', appointmentId);
                      router.push(`/clinic-admin/appointments/${appointmentId}`);
                    }}
                    onViewAllEpisodes={(clientId, clientName) => {
                      console.log('[DoctorDashboard] View all episodes for client:', clientId, clientName);
                      router.push(`/clinic-admin/clients/${clientId}/episodes` as any);
                    }}
                    clientEpisodesCount={episodeCountMap[appointment.client_id] || 0}
                    onStartConsultation={handleStartConsultation}
                    isStartingConsultation={
                      resolverState.loadingAppointmentId === appointment.id
                    }
                  />
                  {/* Per-card inline error message with Retry button */}
                  {hasCardError && (
                    <View style={caseResolverStyles.errorRow}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={16}
                        color={colors.error.main}
                      />
                      <Text style={caseResolverStyles.errorText} numberOfLines={2}>
                        {resolverState.error!.message}
                      </Text>
                      <TouchableOpacity
                        style={caseResolverStyles.retryBtn}
                        onPress={() =>
                          handleStartConsultation(appointment.id, appointment.client_id)
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Retry start consultation"
                      >
                        <Text style={caseResolverStyles.retryBtnText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </React.Fragment>
              );
            })
          )}
        </View>

        {/* Needs Documentation Widget (R3B · T-D.2, FR-D1, Doc 03 §19 — task-oriented language, not "Pending Documentation") */}
        {pendingDocItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Needs Documentation</Text>
            </View>
            {pendingDocItems.slice(0, 5).map((order) => (
              <TouchableOpacity
                key={order.id}
                style={pendingDocStyles.card}
                onPress={() =>
                  router.push(
                    `/clinic-admin/treatment-sheets/${order.id}` as any
                  )
                }
                activeOpacity={0.7}
              >
                <View style={pendingDocStyles.cardLeft}>
                  <Ionicons name="document-text-outline" size={20} color="#F59E0B" />
                  <View style={pendingDocStyles.cardInfo}>
                    <Text style={pendingDocStyles.cardTitle} numberOfLines={1}>
                      {order.planned_sessions
                        ? `${order.planned_sessions}-day plan`
                        : 'Treatment Plan'}
                    </Text>
                    <View style={[pendingDocStyles.statePill, { backgroundColor: getLifecycleStatusColor(order.lifecycle_status, order.lifecycle_status_unresolved) + '18' }]}>
                      <Text style={[pendingDocStyles.stateText, { color: getLifecycleStatusColor(order.lifecycle_status, order.lifecycle_status_unresolved) }]}>
                        {getLifecycleStatusLabel(order.lifecycle_status_label, order.lifecycle_status_unresolved)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            ))}
            {pendingDocItems.length > 5 && (
              <Text style={pendingDocStyles.moreText}>
                +{pendingDocItems.length - 5} more need documentation
              </Text>
            )}
          </View>
        )}

        {/* KPI Period Selector */}
        <View style={styles.section}>
          <View style={styles.kpiHeader}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            <TouchableOpacity onPress={() => refetchKpis()} disabled={isKpiRefetching}>
              <Ionicons
                name="refresh"
                size={20}
                color={isKpiRefetching ? colors.text.disabled : colors.primary.main}
              />
            </TouchableOpacity>
          </View>
          <KpiPeriodSelector
            value={kpiPeriod}
            customFromDate={customFromDate}
            customToDate={customToDate}
            onChange={handlePeriodChange}
            disabled={isKpiLoading}
            testID="kpi-period-selector"
          />
        </View>

        {/* KPI Cards Section */}
        {isKpiLoading ? (
          <View style={styles.section}>
            <View style={styles.kpiLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary.main} />
              <Text style={styles.kpiLoadingText}>Loading metrics...</Text>
            </View>
          </View>
        ) : isKpiError ? (
          <View style={styles.section}>
            <View style={styles.kpiErrorContainer}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.error.main} />
              <Text style={styles.kpiErrorTitle}>{getKpiErrorMessage(kpiError).title}</Text>
              <Text style={styles.kpiErrorMessage}>{getKpiErrorMessage(kpiError).message}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetchKpis()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : kpiCards ? (
          <>
            {/* Consultations KPIs */}
            <View style={styles.section}>
              <Text style={styles.cardSectionTitle}>
                <Ionicons name="calendar" size={16} color={colors.primary.main} /> Consultations
              </Text>
              <KpiStatsGrid items={kpiCards.consultations} testID="consultations-grid" />
            </View>

            {/* Patients KPIs */}
            <View style={styles.section}>
              <Text style={styles.cardSectionTitle}>
                <Ionicons name="people" size={16} color={colors.success.main} /> Patients
              </Text>
              <KpiStatsGrid items={kpiCards.patients} testID="patients-grid" />
            </View>

            {/* Clinical Productivity KPIs - Only show if data available */}
            {kpiCards.productivity && (
              <View style={styles.section}>
                <Text style={styles.cardSectionTitle}>
                  <Ionicons name="document-text" size={16} color={colors.info.main} /> Clinical Productivity
                </Text>
                <KpiStatsGrid items={kpiCards.productivity} testID="productivity-grid" />
              </View>
            )}

            {/* Time Metrics - Only show if data available */}
            {(kpiCards.avgDuration || kpiCards.peakHours.length > 0 || kpiCards.busiestDays.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.cardSectionTitle}>
                  <Ionicons name="time" size={16} color={colors.warning.main} /> Time Metrics
                </Text>
                <TimeMetricsSection
                  avgDuration={kpiCards.avgDuration ?? ''}
                  peakHours={kpiCards.peakHours}
                  busiestDays={kpiCards.busiestDays}
                  testID="time-metrics"
                />
              </View>
            )}
          </>
        ) : (
          <View style={styles.section}>
            <EmptyDashboardState
              icon="analytics-outline"
              title="No KPI Data"
              message="No performance data available for this period."
            />
          </View>
        )}

        {/* Patient Feedback Section */}
        {tenantId && staffId && (
          <View style={styles.section}>
            <StaffFeedbackSection
              tenantId={tenantId}
              staffId={staffId}
              staffType="doctor"
              testID="doctor-feedback-section"
            />
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Doctor Dashboard"
        subtitle={`Welcome back, ${doctorName}`}
        onNotificationPress={() => router.push('/notifications/history')}
        onProfilePress={() => console.log('Profile')}
        onLogoutPress={handleLogout}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isDashboardRefetching || isKpiRefetching}
            onRefresh={handleRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
        {renderContent()}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
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
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardSectionTitle: {
    ...typography.subtitle2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAll: {
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
  kpiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background.default,
    borderRadius: 12,
    gap: spacing.sm,
  },
  kpiLoadingText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  kpiErrorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background.default,
    borderRadius: 12,
    gap: spacing.sm,
  },
  kpiErrorTitle: {
    ...typography.subtitle1,
    color: colors.text.primary,
  },
  kpiErrorMessage: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
  dateScrollContent: {
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
});

const pendingDocStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.default,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  statePill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stateText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  moreText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
});

const caseResolverStyles = StyleSheet.create({
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.main + '12',
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.error.main + '30',
  },
  errorText: {
    ...typography.caption,
    color: colors.error.main,
    flex: 1,
  },
  retryBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.error.main,
    borderRadius: 6,
  },
  retryBtnText: {
    ...typography.caption,
    color: colors.common.white,
    fontWeight: '700',
  },
});
