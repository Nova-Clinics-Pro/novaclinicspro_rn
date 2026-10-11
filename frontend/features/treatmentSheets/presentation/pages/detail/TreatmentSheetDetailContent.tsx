import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../../core/theme/spacing';
import { TreatmentLifecycleStatus, TreatmentOrderResponse } from '../../../data/models/treatmentOrders.dtos';
import { ClinicalReviewOutcome } from '../../../data/datasources/treatmentOrders.api';
import { EmptyTreatmentSheetState } from '../../components/EmptyTreatmentSheetState';
import { TreatmentSheetProgress } from '../../components/TreatmentSheetProgress';
import { UseSendToSchedulingResult } from '../../../data/repositories/treatmentOrders.repository.impl';
import { ClinicalReviewSection } from './ClinicalReviewSection';
import { TreatmentLifecycleActions } from './TreatmentLifecycleActions';
import { TreatmentRowsSection } from './TreatmentRowsSection';
import { TreatmentScheduleSummary } from './TreatmentScheduleSummary';
import { TreatmentSheetInfoCard } from './TreatmentSheetInfoCard';
import { ClientEntity, HeaderEntity, RowFormData, ScheduleRow } from './types';
import { TreatmentSheetResponse } from '../../../data/models/treatmentSheets.dtos';
import { TreatmentOperationError } from '../../../domain/errors/treatmentOperationError';

interface PermissionResult {
  allowed?: boolean;
}

interface PendingMutation {
  isPending?: boolean;
}

interface RowController {
  rowsData: RowFormData[];
  hasBeenSavedOnce: boolean;
  isSavingAll: boolean;
  updateRowField: (index: number, field: keyof RowFormData, value: string) => void;
  copyFromAbove: (index: number) => void;
  toggleEditMode: (index: number) => void;
  updateSingleRow: (index: number) => void;
  saveAllRows: () => void;
}

/** Phase 4 (R4) · T-F.2c (ADR-R4-03) — TreatmentScheduleSummary's own job is
 * admin scheduling: "Schedule Appointments" before rows are scheduled,
 * "View All Appointments" once they are. That job is only relevant during
 * the scheduling/preparation phase, before the Doctor releases the sheet to
 * the Therapist — once released, scheduling is settled and therapy
 * execution is the active concern (TreatmentLifecycleActions/
 * ClinicalReviewSection own that phase instead). Replaces the old
 * `treatmentSheet.status === 'DRAFT'` gate (always true in practice — a
 * backward-compat document field, never a workflow signal, ADR-R4-03) with
 * the resolver's own lifecycle_status. */
const SCHEDULING_PHASE_LIFECYCLE_STATUSES: ReadonlySet<TreatmentLifecycleStatus> = new Set([
  'recommended',
  'needs_scheduling',
  'scheduling_on_hold',
  'scheduled_awaiting_treatment_sheet',
  'treatment_sheet_draft',
]);

export const isInSchedulingPhase = (order?: TreatmentOrderResponse): boolean =>
  !!order &&
  !order.lifecycle_status_unresolved &&
  !!order.lifecycle_status &&
  SCHEDULING_PHASE_LIFECYCLE_STATUSES.has(order.lifecycle_status);

interface HeaderData {
  episodeData: HeaderEntity | null;
  clientData: ClientEntity | null;
  isLoadingHeaderData: boolean;
}

interface Props {
  treatmentSheet?: TreatmentSheetResponse;
  /** Phase 4 (R4) · T-E.4 (ADR-R4-06) — row-content editing is DOCTOR-only,
   * never gated by treatmentSheet.status (DRAFT/FINAL/SIGNED is a backward-
   * compat-only document field, ADR-R4-03). Admin reaches this same screen
   * via orders.tsx's "View Sheet" for scheduling/read-only purposes only. */
  isDoctor: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  isRefetching: boolean;
  refetch: () => void;
  rows: RowController;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  headerData: HeaderData;
  treatmentOrder?: TreatmentOrderResponse;
  isOrderLoading: boolean;
  sendToScheduling: UseSendToSchedulingResult;
  treatmentSheetId: string;
  orderVersion: number;
  scheduleSent: boolean;
  canPauseResult?: PermissionResult;
  canResumeResult?: PermissionResult;
  canCancelResult?: PermissionResult;
  pauseMutation: PendingMutation;
  cancelMutation: PendingMutation;
  onScheduleAppointments: () => void;
  onViewAppointments: () => void;
  onScheduleRow: (row: ScheduleRow) => void;
  onShowPatientSchedule: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  /** Phase 4 (R4) · T-E.5 (ADR-R4-06). */
  onRelease: () => void;
  releaseMutation: PendingMutation;
  /** Phase 4 (R4) · T-E.6 (ADR-R4-07). */
  onAddClinicalReviewNote: (notesJson: Record<string, unknown>) => void;
  addClinicalReviewNoteMutation: PendingMutation;
  onRecordClinicalReviewOutcome: (outcome: ClinicalReviewOutcome, notesJson: Record<string, unknown>) => void;
  recordClinicalReviewOutcomeMutation: PendingMutation;
}

export const TreatmentSheetDetailContent: React.FC<Props> = ({
  treatmentSheet,
  isDoctor,
  isLoading,
  isError,
  error,
  isRefetching,
  refetch,
  rows,
  page,
  setPage,
  headerData,
  treatmentOrder,
  isOrderLoading,
  sendToScheduling,
  treatmentSheetId,
  orderVersion,
  scheduleSent,
  canPauseResult,
  canResumeResult,
  canCancelResult,
  pauseMutation,
  cancelMutation,
  onScheduleAppointments,
  onViewAppointments,
  onScheduleRow,
  onShowPatientSchedule,
  onPause,
  onResume,
  onCancel,
  onRelease,
  releaseMutation,
  onAddClinicalReviewNote,
  addClinicalReviewNoteMutation,
  onRecordClinicalReviewOutcome,
  recordClinicalReviewOutcomeMutation,
}) => {
  const theme = useClinicTheme();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.default} />
        <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>Loading treatment sheet...</Text>
      </View>
    );
  }

  if (isError || !treatmentSheet) {
    return (
      <EmptyTreatmentSheetState
        variant="error"
        title="Unable to Load Treatment Sheet"
        message={error instanceof TreatmentOperationError && error.kind === 'AUTHENTICATION_REQUIRED' ? 'Authentication failed. Please try logging in again.' : 'Could not load this treatment sheet. Please try again.'}
        actionLabel="Retry"
        onActionPress={refetch}
      />
    );
  }

  // A treatment recommendation has no rows until admin scheduling creates
  // them — that must NOT blank out the whole page. Recommendation metadata
  // (therapy, duration, frequency, notes, status) and every action that
  // doesn't depend on rows (send to scheduling, schedule appointments, pause/
  // resume/cancel) must stay visible; "No treatment days scheduled yet" is
  // shown only inside the Treatment Days section below (TreatmentRowsSection).
  const hasRows = rows.rowsData.length > 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.colors.primary.default]} tintColor={theme.colors.primary.default} />}
        showsVerticalScrollIndicator={false}
      >
        <TreatmentSheetInfoCard treatmentSheet={treatmentSheet} rowsData={rows.rowsData} treatmentOrder={treatmentOrder} {...headerData} />
        {isInSchedulingPhase(treatmentOrder) ? (
          <TreatmentScheduleSummary rowsData={rows.rowsData} onScheduleAppointments={onScheduleAppointments} onViewAppointments={onViewAppointments} />
        ) : null}
        {hasRows ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Progress</Text>
            <TreatmentSheetProgress rows={treatmentSheet.rows || []} showDetails />
          </View>
        ) : null}
        <TreatmentRowsSection
          rowsData={rows.rowsData}
          hasBeenSavedOnce={rows.hasBeenSavedOnce}
          isSavingAll={rows.isSavingAll}
          page={page}
          canEdit={isDoctor}
          treatmentOrder={treatmentOrder}
          onSetPage={setPage}
          onSaveAllRows={rows.saveAllRows}
          onUpdateField={rows.updateRowField}
          onUpdateSingleRow={rows.updateSingleRow}
          onToggleEditMode={rows.toggleEditMode}
          onCopyFromAbove={rows.copyFromAbove}
          onScheduleRow={onScheduleRow}
        />
        <TreatmentLifecycleActions
          treatmentOrder={treatmentOrder}
          isOrderLoading={isOrderLoading}
          sendToScheduling={sendToScheduling}
          treatmentSheetId={treatmentSheetId}
          orderVersion={orderVersion}
          scheduleSent={scheduleSent}
          canPauseResult={canPauseResult}
          canResumeResult={canResumeResult}
          canCancelResult={canCancelResult}
          pauseMutation={pauseMutation}
          cancelMutation={cancelMutation}
          onShowPatientSchedule={onShowPatientSchedule}
          onPause={onPause}
          onResume={onResume}
          onCancel={onCancel}
          isDoctor={isDoctor}
          onRelease={onRelease}
          releaseMutation={releaseMutation}
        />
        <ClinicalReviewSection
          treatmentOrder={treatmentOrder}
          isDoctor={isDoctor}
          onAddNote={onAddClinicalReviewNote}
          addNoteMutation={addClinicalReviewNoteMutation}
          onRecordOutcome={onRecordClinicalReviewOutcome}
          recordOutcomeMutation={recordClinicalReviewOutcomeMutation}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.md },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { fontSize: 14, marginTop: spacing.md },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing.sm },
});
