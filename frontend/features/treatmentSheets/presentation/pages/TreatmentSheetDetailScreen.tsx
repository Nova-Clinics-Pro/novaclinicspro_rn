/**
 * R7 · T-0.7 (ED-ARCH-001): the pause/resume/cancel-eligibility checks and
 * pause/cancel actions previously called `lifecycleApi.ts` (a datasource
 * file) directly via three raw `useQuery` calls and two raw `useMutation`
 * calls defined inline in this screen. Repointed to
 * `useCanPauseTreatmentSeriesQuery`/`useCanResumeTreatmentSeriesQuery`/
 * `useCanCancelTreatmentSeriesQuery`/`usePauseTreatmentSeriesMutation`/
 * `useCancelTreatmentSeriesMutation` (`treatmentSheets.repository.impl.ts`
 * — see that file's own docstring). `handleScheduleAppointments`'s direct
 * `axiosClient.get(episode)` call was repointed to the existing, already-
 * governed `useEpisodeQuery` (`episodes.repository.impl.ts`) — declared at
 * top level with `enabled: false` and triggered on demand via its own
 * `refetch({ throwOnError: true })`, preserving the original "fetch only
 * when the button is pressed" trigger (a hook cannot be called
 * imperatively inside an event handler).
 *
 * `useTreatmentSheetHeaderData` (this screen's OTHER, pre-existing direct
 * `axiosClient` user) is left untouched — a separate, already-existing
 * violation outside this task's declared change surface, recorded as a
 * finding for a future task rather than fixed here.
 */
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { ClinicalPrintPreviewModal } from '../../../../core/clinicalPrint/ClinicalPrintPreviewModal';
import { buildTreatmentSheetPrintHtml } from '../../../../core/clinicalPrint/adapters';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useEpisodeQuery } from '../../../episodes/data/repositories/episodes.repository.impl';
import {
  useArchiveTreatmentSheetMutation,
  usePrintTreatmentSheetMutation,
  useTreatmentSheetDetailQuery,
  useCanPauseTreatmentSeriesQuery,
  useCanResumeTreatmentSeriesQuery,
  useCanCancelTreatmentSeriesQuery,
  usePauseTreatmentSeriesMutation,
  useCancelTreatmentSeriesMutation,
} from '../../index';
import {
  useSendToSchedulingMutation,
  useTreatmentOrderQuery,
  useReleaseTreatmentSheetMutation,
  useAddClinicalReviewNoteMutation,
  useRecordClinicalReviewOutcomeMutation,
} from '../../data/repositories/treatmentOrders.repository.impl';
import { ClinicalReviewOutcome } from '../../data/datasources/treatmentOrders.api';
import { CancelSeriesDialog } from '../components/CancelSeriesDialog';
import { PatientScheduleModal } from '../components/PatientScheduleModal';
import { PauseSeriesDialog } from '../components/PauseSeriesDialog';
import { ScheduleRowModal } from '../components/ScheduleRowModal';
import { TreatmentSheetDetailContent } from './detail/TreatmentSheetDetailContent';
import { TreatmentSheetDetailHeader } from './detail/TreatmentSheetDetailHeader';
import { useTreatmentSheetHeaderData } from './detail/useTreatmentSheetHeaderData';
import { useTreatmentSheetRows } from './detail/useTreatmentSheetRows';
import { ScheduleRow } from './detail/types';
import { treatmentErrorMessage } from '../../application/treatmentErrorPresentation';

export const TreatmentSheetDetailScreen: React.FC = () => {
  const theme = useClinicTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ treatmentSheetId: string; casesheetId?: string }>();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const treatmentSheetId = params.treatmentSheetId || '';
  const tenantId = currentUser?.tenantId || '';
  // Phase 4 (R4) · T-E.4 (ADR-R4-06) — row-content editing is DOCTOR-only
  // (Admin reaches this same canonical screen via orders.tsx's "View Sheet"
  // for scheduling operations only; Therapist never reaches it). Mirrors
  // CasesheetStandaloneScreen.tsx's own isDoctor pattern.
  const isDoctor = currentUser?.roles?.includes('DOCTOR') || false;
  const [page, setPage] = useState(1);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPatientSchedule, setShowPatientSchedule] = useState(false);
  const [scheduleSent, setScheduleSent] = useState(false);
  const [schedulingRow, setSchedulingRow] = useState<ScheduleRow | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printHtmlContent, setPrintHtmlContent] = useState('');

  const detailQuery = useTreatmentSheetDetailQuery(treatmentSheetId, tenantId);
  const { data: treatmentSheet, isLoading, isError, error, refetch, isRefetching } = detailQuery;
  const printMutation = usePrintTreatmentSheetMutation(tenantId, treatmentSheetId);
  const archiveMutation = useArchiveTreatmentSheetMutation(tenantId, treatmentSheetId);

  const {
    data: treatmentOrder,
    isLoading: isOrderLoading,
    refetch: refetchOrder,
  } = useTreatmentOrderQuery(treatmentSheetId, tenantId, {
    enabled: !!treatmentSheetId && !!tenantId,
  });
  const sendToScheduling = useSendToSchedulingMutation(tenantId);
  const releaseMutation = useReleaseTreatmentSheetMutation(tenantId);
  const addClinicalReviewNoteMutation = useAddClinicalReviewNoteMutation();
  const recordClinicalReviewOutcomeMutation = useRecordClinicalReviewOutcomeMutation(tenantId);
  const orderVersion = treatmentOrder?.version ?? 1;
  const headerData = useTreatmentSheetHeaderData(tenantId, treatmentSheet?.episode_id);
  const rows = useTreatmentSheetRows({ tenantId, treatmentSheetId, treatmentSheet, refetch });
  // On-demand only (enabled: false) — triggered imperatively via
  // .refetch() from handleScheduleAppointments below, preserving the
  // original "fetch only when the button is pressed" behavior (a hook
  // cannot itself be called imperatively inside an event handler).
  const episodeQuery = useEpisodeQuery(tenantId, treatmentSheet?.episode_id ?? '', { enabled: false });

  const canPauseQuery = useCanPauseTreatmentSeriesQuery(tenantId, treatmentSheetId, {
    enabled: !!tenantId && !!treatmentSheetId && !!treatmentSheet,
  });
  const canResumeQuery = useCanResumeTreatmentSeriesQuery(tenantId, treatmentSheetId, {
    enabled: !!tenantId && !!treatmentSheetId && !!treatmentSheet,
  });
  const canCancelQuery = useCanCancelTreatmentSeriesQuery(tenantId, treatmentSheetId, {
    enabled: !!tenantId && !!treatmentSheetId && !!treatmentSheet,
  });

  const pauseMutation = usePauseTreatmentSeriesMutation(tenantId, treatmentSheetId, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment-sheet', treatmentSheetId] });
      queryClient.invalidateQueries({ queryKey: ['can-pause-series', tenantId, treatmentSheetId] });
      queryClient.invalidateQueries({ queryKey: ['can-resume-series', tenantId, treatmentSheetId] });
      Alert.alert('Success', 'Treatment series paused successfully');
      setShowPauseDialog(false);
      refetch();
    },
    onError: (err: Error) => Alert.alert('Error', err.message || 'Failed to pause treatment series'),
  });

  const cancelMutation = useCancelTreatmentSeriesMutation(tenantId, treatmentSheetId, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment-sheet', treatmentSheetId] });
      queryClient.invalidateQueries({ queryKey: ['can-cancel-series', tenantId, treatmentSheetId] });
      Alert.alert('Success', 'Treatment series cancelled successfully');
      setShowCancelDialog(false);
      refetch();
    },
    onError: (err: Error) => Alert.alert('Error', err.message || 'Failed to cancel treatment series'),
  });

  const handlePrint = useCallback(async () => {
    try {
      const result = await printMutation.mutateAsync();
      setPrintHtmlContent(buildTreatmentSheetPrintHtml(result));
      setShowPrintPreview(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to print.');
    }
  }, [printMutation]);

  const handleArchive = useCallback(async () => {
    try {
      await archiveMutation.mutateAsync();
      Alert.alert('Success', 'Treatment sheet archived.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to archive.');
    }
  }, [archiveMutation, router]);

  const handleScheduleAppointments = useCallback(async () => {
    if (!treatmentSheet) return;
    try {
      const { data: episode } = await episodeQuery.refetch({ throwOnError: true });
      // Episode's own type has no `treatment_id` field (a pre-existing gap
      // predating T-0.7 between the frontend type and the raw backend
      // response, tolerated here exactly as the previous untyped axios call
      // already tolerated it via the same `|| ''` fallback).
      const treatmentId = (episode as any)?.treatment_id || '';
      router.push({
        pathname: '/clinic-admin/appointments/create',
        params: {
          tab: 'MULTI',
          treatmentSheetId,
          episodeId: treatmentSheet.episode_id,
          caseSheetId: treatmentSheet.case_sheet_id || params.casesheetId || '',
          treatmentId,
          treatmentName: episode?.title || '',
          durationDays: treatmentSheet.duration_days?.toString(),
        },
      });
    } catch {
      router.push({
        pathname: '/clinic-admin/appointments/create',
        params: {
          tab: 'MULTI',
          treatmentSheetId,
          episodeId: treatmentSheet.episode_id,
          durationDays: treatmentSheet.duration_days?.toString(),
        },
      });
    }
  }, [episodeQuery, params.casesheetId, router, treatmentSheet, treatmentSheetId]);

  const handleResume = useCallback(() => {
    if (!treatmentSheet) return;
    const completedDays = rows.rowsData.filter(row => row.treatment_name.trim()).length;
    const remainingDays = Math.max(0, (treatmentSheet.duration_days || 0) - completedDays);
    router.push({
      pathname: '/clinic-admin/appointments/create',
      params: {
        tab: 'MULTI',
        treatmentSheetId,
        episodeId: treatmentSheet.episode_id,
        durationDays: remainingDays.toString(),
      },
    });
  }, [router, rows.rowsData, treatmentSheet, treatmentSheetId]);

  const handlePauseConfirm = useCallback((reason: string, hasConsent: boolean) => {
    pauseMutation.mutate({ reason, patient_consent: hasConsent, billing_acknowledged: true });
  }, [pauseMutation]);

  const handleCancelConfirm = useCallback((reason: string) => {
    cancelMutation.mutate({ reason });
  }, [cancelMutation]);

  // Phase 4 (R4) · T-E.5 (ADR-R4-06) — Release Treatment Sheet: whole-sheet,
  // Doctor-only. Version conflicts surface via the mutation's own onError.
  const handleRelease = useCallback(() => {
    releaseMutation.mutate(
      { sheetId: treatmentSheetId, version: orderVersion },
      {
        onError: (error: unknown) =>
          Alert.alert('Error', treatmentErrorMessage(error, 'Failed to release treatment sheet.')),
      }
    );
  }, [releaseMutation, treatmentSheetId, orderVersion]);

  // Phase 4 (R4) · T-E.6 (ADR-R4-07) — Clinical Review note: documentation
  // only, never mutates the sheet's version.
  const handleAddClinicalReviewNote = useCallback((notesJson: Record<string, unknown>) => {
    addClinicalReviewNoteMutation.mutate(
      { sheetId: treatmentSheetId, notesJson },
      {
        onError: (error: unknown) =>
          Alert.alert('Error', treatmentErrorMessage(error, 'Failed to save observation.')),
      }
    );
  }, [addClinicalReviewNoteMutation, treatmentSheetId]);

  // Phase 4 (R4) · T-E.6 (ADR-R4-07) — Clinical Review DECISION, distinct
  // from the note above. stop_remaining/complete move the plan to Treatment
  // Complete; continue_unchanged/update_future_rows/extend keep it In Therapy.
  const handleRecordClinicalReviewOutcome = useCallback((outcome: ClinicalReviewOutcome, notesJson: Record<string, unknown>) => {
    recordClinicalReviewOutcomeMutation.mutate(
      { sheetId: treatmentSheetId, version: orderVersion, outcome, notesJson },
      {
        onError: (error: unknown) =>
          Alert.alert('Error', treatmentErrorMessage(error, 'Failed to record outcome.')),
      }
    );
  }, [recordClinicalReviewOutcomeMutation, treatmentSheetId, orderVersion]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]} edges={['top']}>
      <TreatmentSheetDetailHeader
        treatmentSheet={treatmentSheet}
        treatmentOrder={treatmentOrder}
        rowsCount={rows.rowsData.length}
        isPrinting={printMutation.isPending}
        isArchiving={archiveMutation.isPending}
        onBack={() => router.back()}
        onPrint={handlePrint}
        onArchive={handleArchive}
      />
      <View style={styles.content}>
        <TreatmentSheetDetailContent
          treatmentSheet={treatmentSheet}
          isDoctor={isDoctor}
          isLoading={isLoading}
          isError={isError}
          error={error}
          isRefetching={isRefetching}
          refetch={() => refetch()}
          rows={rows}
          page={page}
          setPage={setPage}
          headerData={headerData}
          treatmentOrder={treatmentOrder}
          isOrderLoading={isOrderLoading}
          sendToScheduling={sendToScheduling}
          treatmentSheetId={treatmentSheetId}
          orderVersion={orderVersion}
          scheduleSent={scheduleSent}
          canPauseResult={canPauseQuery.data}
          canResumeResult={canResumeQuery.data}
          canCancelResult={canCancelQuery.data}
          pauseMutation={pauseMutation}
          cancelMutation={cancelMutation}
          onScheduleAppointments={handleScheduleAppointments}
          onViewAppointments={() => router.push('/clinic-admin/appointments' as any)}
          onScheduleRow={setSchedulingRow}
          onShowPatientSchedule={() => {
            setScheduleSent(true);
            setShowPatientSchedule(true);
          }}
          onPause={() => setShowPauseDialog(true)}
          onResume={handleResume}
          onCancel={() => setShowCancelDialog(true)}
          onRelease={handleRelease}
          releaseMutation={releaseMutation}
          onAddClinicalReviewNote={handleAddClinicalReviewNote}
          addClinicalReviewNoteMutation={addClinicalReviewNoteMutation}
          onRecordClinicalReviewOutcome={handleRecordClinicalReviewOutcome}
          recordClinicalReviewOutcomeMutation={recordClinicalReviewOutcomeMutation}
        />
      </View>
      <PauseSeriesDialog
        visible={showPauseDialog}
        treatmentName={treatmentSheet?.duration_days ? `${treatmentSheet.duration_days} Day Treatment` : 'Treatment Series'}
        billingImpact={undefined}
        onConfirm={handlePauseConfirm}
        onCancel={() => setShowPauseDialog(false)}
        loading={pauseMutation.isPending}
      />
      <CancelSeriesDialog
        visible={showCancelDialog}
        treatmentName={treatmentSheet?.duration_days ? `${treatmentSheet.duration_days} Day Treatment` : 'Treatment Series'}
        billingImpact={undefined}
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelDialog(false)}
        loading={cancelMutation.isPending}
      />
      <ClinicalPrintPreviewModal
        visible={showPrintPreview}
        html={printHtmlContent}
        title="Treatment Sheet Preview"
        onClose={() => setShowPrintPreview(false)}
      />
      {showPatientSchedule && treatmentOrder ? (
        <PatientScheduleModal visible={showPatientSchedule} order={treatmentOrder} onClose={() => setShowPatientSchedule(false)} />
      ) : null}
      {schedulingRow ? (
        <ScheduleRowModal
          visible={!!schedulingRow}
          tenantId={tenantId}
          sheetId={treatmentSheetId}
          row={schedulingRow}
          orderVersion={orderVersion}
          onClose={() => setSchedulingRow(null)}
          onScheduled={() => {
            setSchedulingRow(null);
            refetchOrder();
          }}
          onVersionConflict={() => {
            setSchedulingRow(null);
            refetchOrder();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});

export default TreatmentSheetDetailScreen;
