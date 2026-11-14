/**
 * EpisodeWorkspaceScreen
 *
 * Unified Episode Workspace for Doctor and Admin roles.
 * This file is orchestration-only: navigation handlers + layout shell.
 *
 * SOLID:
 *  - Single Responsibility: routing + composition only; no inline UI logic
 *  - Open/Closed: role behaviour injected via episodeWorkspaceConfigByRole
 *  - DRY: one screen, two modes; all sub-components are in separate files
 *
 * Sub-components:
 *  - EpisodeWorkspaceHeader  → EpisodeHeader, WorkspaceTabBar
 *  - VisitNotesTab, TreatmentPlansTab, PrescriptionsTab (each in own file)
 *  - EpisodeWorkspaceShared  → SectionSkeleton, SectionError
 *
 * Accessibility: tab roles, accessible labels, live regions.
 * Localization: all strings via useTranslation / t().
 * Cross-platform: no platform-specific APIs; works on Android, iOS, Web.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  AccessibilityInfo,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useEpisodeWorkspaceData } from '../hooks/useEpisodeWorkspaceData';
import {
  WorkspaceMode,
  episodeWorkspaceConfigByRole,
} from '../config/episodeWorkspaceConfig';
import {
  EpisodeHeader,
  WorkspaceTabBar,
  WorkspaceTab,
  ALL_WORKSPACE_TABS,
} from '../components/EpisodeWorkspaceHeader';
import { CasesheetTab } from '../components/CasesheetTab';
import { clinicalAuthoringAccess } from '../../domain/clinicalAuthoringAccess';
import { TreatmentPlansTab } from '../components/TreatmentPlansTab';
import { VisitsTab } from '../components/VisitsTab';
import { SectionError } from '../components/EpisodeWorkspaceShared';

// ─── Props ────────────────────────────────────────────────────────────────────

export type { WorkspaceTab };

export interface EpisodeWorkspaceScreenProps {
  mode: WorkspaceMode;
  episodeId: string;
  /** Client ID — passed from appointment card to avoid an extra fetch */
  clientId: string;
  /** Pre-select a tab on open (e.g. from a shortcut button) */
  initialTab?: WorkspaceTab;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export const EpisodeWorkspaceScreen: React.FC<EpisodeWorkspaceScreenProps> = ({
  mode,
  episodeId,
  clientId,
  initialTab = 'prescriptions',
}) => {
  const { colors, spacing, typography } = useClinicTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId ?? '';

  const modeConfig = episodeWorkspaceConfigByRole[mode];
  // The workspace mode comes from the route, so it can only narrow what the user may do: clinical authoring also
  // requires the permission the backend enforces (Doctor only).
  const authoring = clinicalAuthoringAccess(currentUser?.permissions);
  const config = {
    ...modeConfig,
    canEditNotes: modeConfig.canEditNotes && authoring.canCreateCasesheet,
    canCreateTreatmentSheet: modeConfig.canCreateTreatmentSheet && authoring.canCreateTreatmentSheet,
    canWriteRx: modeConfig.canWriteRx && authoring.canCreatePrescription,
  };
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);

  const {
    episodeDetails,
    isEpisodeLoading,
    isEpisodeError,
    refetchEpisode,
    casesheet,
    casesheetId,
    hasCasesheet,
    isCasesheetLoading,
    treatmentSheet,
    treatmentSheets,
    hasTreatmentSheet,
    isTreatmentSheetLoading,
    isTreatmentSheetError,
    refetchTreatmentSheet,
    visits,
    clientName,
  } = useEpisodeWorkspaceData(tenantId, episodeId, clientId);

  const episode = episodeDetails?.episode;
  const resolvedClientId = episode?.client_id ?? clientId;

  // ── Navigation handlers ───────────────────────────────────────────────────

  const handleCreateCasesheet = useCallback(() => {
    const firstVisit = episodeDetails?.visits?.[0];
    const base = `/clinic-admin/clients/${resolvedClientId}/casesheets/new`;
    if (firstVisit) {
      router.push(`${base}?appointmentId=${firstVisit.appointment_id}&episodeId=${episodeId}` as any);
    } else {
      router.push(`${base}?episodeId=${episodeId}` as any);
    }
  }, [router, resolvedClientId, episodeId, episodeDetails]);

  // Phase 4 (R4) · T-F.2a (ADR-R4-05) — Edit routes to the canonical Case
  // Sheet owner (CasesheetStandaloneScreen); CasesheetTab no longer saves
  // in place.
  const handleEditCasesheet = useCallback(() => {
    if (!casesheetId) return;
    router.push(`/clinic-admin/clients/${resolvedClientId}/casesheets/${casesheetId}/edit` as any);
  }, [router, resolvedClientId, casesheetId]);

  const handleOpenSheet = useCallback(
    (id: string) => {
      router.push(`/clinic-admin/treatment-sheets/${id}` as any);
    },
    [router]
  );

  const handleScheduleSheet = useCallback(
    (id: string) => {
      // Navigate to the multi-day appointment creation screen, pre-filled from the treatment sheet.
      // This reuses the existing CreateAppointmentScreen (tab=MULTI) — no duplicate scheduling UI.
      router.push(
        `/clinic-admin/appointments/create?tab=MULTI&treatmentSheetId=${id}` as any
      );
    },
    [router]
  );

  const handleViewPrescription = useCallback(
    (id: string) => {
      router.push(`/clinic-admin/clients/${resolvedClientId}/prescriptions/${id}` as any);
    },
    [router, resolvedClientId]
  );

  const handleCreatePrescription = useCallback(
    (appointmentId: string) => {
      router.push(
        `/clinic-admin/clients/${resolvedClientId}/prescriptions/new?appointmentId=${appointmentId}` as any
      );
    },
    [router, resolvedClientId]
  );

  const handleVisitPress = useCallback(
    (appointmentId: string) => {
      router.push(`/clinic-admin/appointments/${appointmentId}` as any);
    },
    [router]
  );

  const handleTabChange = useCallback(
    (tab: WorkspaceTab) => {
      setActiveTab(tab);
      AccessibilityInfo.announceForAccessibility(t(`episodeWorkspace.tabs.${tab}`));
    },
    [t]
  );

  // Gate Treatment Plans tab — only show when a casesheet exists
  const visibleTabs = ALL_WORKSPACE_TABS.filter(
    (tab) => tab.key !== 'treatmentPlans' || hasCasesheet
  );

  // ── Nav header (shared across loading/error/success states) ──────────────

  const NavHeader = (
    <View
      style={[
        styles.navHeader,
        {
          borderBottomColor: colors.border.subtle,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel={t('episodeWorkspace.actions.back')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      {episode && (
        <Text
          style={[typography.h6, { color: colors.text.primary, flex: 1 }]}
          numberOfLines={1}
        >
          {episode.title}
        </Text>
      )}
    </View>
  );

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isEpisodeLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background.default }]}
        edges={['top']}
      >
        {NavHeader}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.default} />
          <Text style={[typography.body2, { color: colors.text.secondary }]}>
            {t('episodeWorkspace.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (isEpisodeError || !episode) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background.default }]}
        edges={['top']}
      >
        {NavHeader}
        <SectionError
          message={t('errors.episodeWorkspace.loadFailed')}
          onRetry={refetchEpisode}
        />
      </SafeAreaView>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.default }]}
      edges={['top']}
    >
      {NavHeader}

      <EpisodeHeader
        clientName={clientName || episode.client_name || ''}
        episodeTitle={episode.title}
        episodeStatus={episode.status}
        startDate={episode.start_date}
        visitsCount={episode.visits_count}
      />

      <WorkspaceTabBar activeTab={activeTab} onTabChange={handleTabChange} tabs={visibleTabs} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isEpisodeLoading}
            onRefresh={refetchEpisode}
            colors={[colors.primary.default]}
            tintColor={colors.primary.default}
          />
        }
      >
        <View
          accessibilityRole="none"
          accessibilityLabel={t(`episodeWorkspace.tabs.${activeTab}`)}
        >
          {activeTab === 'visitNotes' && (
            <CasesheetTab
              casesheet={casesheet}
              casesheetId={casesheetId}
              hasCasesheet={hasCasesheet}
              isLoading={isCasesheetLoading}
              canCreate={config.canEditNotes}
              onCreateCasesheet={handleCreateCasesheet}
              onEditCasesheet={handleEditCasesheet}
            />
          )}

          {activeTab === 'treatmentPlans' && (
            <TreatmentPlansTab
              sheet={treatmentSheet}
              sheets={treatmentSheets}
              hasTreatmentSheet={hasTreatmentSheet}
              isLoading={isTreatmentSheetLoading}
              isError={isTreatmentSheetError}
              canCreate={config.canCreateTreatmentSheet}
              canSchedule={config.canSchedule}
              tenantId={tenantId}
              casesheetId={casesheetId}
              onRetry={refetchTreatmentSheet}
              onOpenSheet={handleOpenSheet}
              onScheduleSheet={handleScheduleSheet}
              onSheetCreated={(id) => { refetchTreatmentSheet(); handleOpenSheet(id); }}
              onRefreshSheet={refetchTreatmentSheet}
            />
          )}

          {activeTab === 'prescriptions' && (
            <VisitsTab
              visits={visits}
              isLoading={isEpisodeLoading}
              canWriteRx={config.canWriteRx}
              onViewPrescription={handleViewPrescription}
              onCreatePrescription={handleCreatePrescription}
              onVisitPress={handleVisitPress}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: {},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scrollView: { flex: 1 },
});

export default EpisodeWorkspaceScreen;
