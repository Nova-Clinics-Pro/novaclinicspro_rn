/**
 * PrescriptionStandaloneScreen (R3B · T-B.5, ADR-R3B-05, design.md §8 step 4
 * — "identical pattern applies to Prescription")
 *
 * Thin standalone host for the canonical Prescription editing core (T-B.4)
 * — `PrescriptionEditingCore` — unifying `PrescriptionEditScreen` (edit an
 * existing prescription) and `CreatePrescriptionScreen` (create a new one)
 * into one wrapper, mirroring `CasesheetStandaloneScreen`'s own T-B.2
 * pattern exactly. Deliberately does NOT render `PrescriptionForm.tsx` —
 * that file is the OLD standalone implementation, staying fully intact as
 * the OFF-path (Group B's own restructuring rule) until a future flag-gated
 * route switch (T-B.6).
 *
 * No Persistent Context, no autosave: this screen owns its own local
 * `prescriptionData` draft state, passed to the core's own explicit "Save
 * Prescription" button (`onSave` prop) — the core itself owns that button,
 * unlike Case Sheet's core (T-B.1 has no save button at all). This is the
 * first host to actually activate `notes`/`next_visit_days` via
 * `activeAdviceFields` (the fields T-0.3 found existed only in the
 * standalone form) — no `follow_up_instructions`, matching the standalone
 * form's own field set exactly.
 *
 * Takes identifiers as PROPS rather than calling `useLocalSearchParams()`
 * itself — same rationale as `CasesheetStandaloneScreen` (T-B.2): matches
 * the episode-flow entry-point convention, keeps this screen directly
 * renderable in a test. Not yet wired to any route — that is T-B.6's job.
 *
 * Host-level concerns replicated from the old screens (T-0.3's own
 * characterization — non-core behavior the standalone context must carry):
 *  - Edit mode's status/role edit-gate (DRAFT always editable; SIGNED only
 *    by a DOCTOR-role user; FINAL never) — `PrescriptionEditScreen`'s own
 *    check, unchanged.
 *  - Silent submission block when no medication has both a name and a
 *    dosage, and filtering out incomplete medication rows on submit —
 *    `PrescriptionForm.tsx`'s own exact behavior (T-0.3, confirmed real,
 *    not a bug — reconciled here since `PrescriptionEditingCore` itself has
 *    no validation of its own, by design, matching Case Sheet's host-level
 *    status/role gate precedent).
 *  - Create mode's reactive `PRESCRIPTION_ALREADY_EXISTS` handling
 *    (`CreatePrescriptionScreen`'s own error-response pattern — NOT a
 *    proactive pre-render guard like Case Sheet's; Prescription's own
 *    standalone screen never had one, confirmed by re-reading it here).
 *  - Both modes reuse the existing `usePrescriptionDetailQuery`/
 *    `useUpdatePrescriptionMutation`/`useCreatePrescriptionMutation` hooks
 *    unchanged — including their always-on cache invalidation, never gated
 *    by `isFreshnessV1Enabled` (the same finding T-B.2 made and corrected
 *    design §9 for on the Case Sheet side — confirmed to hold identically
 *    here via the same `grep`; not a fresh correction, since design §9's
 *    Prescription-side text was already generic enough not to contradict).
 *
 * One deliberate departure from `PrescriptionEditScreen`'s own current
 * behavior, in NEW code only: `next_visit_days` is shown as editable only
 * in CREATE mode. In the old screen, it's shown as editable in EDIT mode
 * too, but `PrescriptionEditScreen`'s own update call never sends it
 * (`PrescriptionUpdateRequest` has no such field, confirmed by reading
 * `prescriptions.dtos.ts`) — any edit the doctor makes there is silently
 * discarded. Not repeating that in fresh code is not a fix to the old
 * screen (untouched, still the OFF-path); the quirk stays exactly as it is
 * there.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  usePrescriptionDetailQuery,
  useCreatePrescriptionMutation,
  useUpdatePrescriptionMutation,
} from '../../data/repositories/prescriptions.repository.impl';
import { isEditable, PrescriptionData } from '../../data/models/prescriptions.dtos';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { PrescriptionStatusBadge } from '../components/PrescriptionStatusBadge';
import { EmptyPrescriptionsState } from '../components/EmptyPrescriptionsState';
import { PrescriptionEditingCore, PrescriptionAdviceFieldId } from '../components/PrescriptionEditingCore';
import { useAppointmentDetailQuery } from '../../../appointments/data/repositories/appointments.repository.impl';
import { useEpisodeQuery } from '../../../episodes/data/repositories/episodes.repository.impl';

export interface PrescriptionStandaloneScreenProps {
  clientId: string;
  /** Present → edit mode. Absent → create mode. */
  prescriptionId?: string;
  /** Create mode only. */
  appointmentId?: string;
}

const EMPTY_PRESCRIPTION_DATA: PrescriptionData = { medications: [] };
// PrescriptionForm.tsx's own default — one empty medication row, not zero —
// carried into create mode here for the same UX (T-0.3's own baseline:
// "renders one empty medication row by default"). Edit mode instead loads
// the prescription's real medications, so it starts from `EMPTY_PRESCRIPTION_DATA`.
const CREATE_MODE_INITIAL_DATA: PrescriptionData = {
  medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
};
const CREATE_MODE_ADVICE_FIELDS: PrescriptionAdviceFieldId[] = ['dietary_advice', 'lifestyle_advice', 'notes', 'next_visit_days'];
const EDIT_MODE_ADVICE_FIELDS: PrescriptionAdviceFieldId[] = ['dietary_advice', 'lifestyle_advice', 'notes'];

function usePrescriptionDraft(initial: PrescriptionData = EMPTY_PRESCRIPTION_DATA) {
  const [data, setData] = useState<PrescriptionData>(initial);
  const [notes, setNotes] = useState('');
  const [nextVisitDays, setNextVisitDays] = useState('');

  const onChange = useCallback((next: PrescriptionData) => setData(next), []);

  // Filters out incomplete rows and blocks entirely if none are valid —
  // PrescriptionForm.tsx's own exact submit-time behavior (T-0.3).
  const getValidMedications = useCallback(() => {
    return (data.medications ?? []).filter((m) => m.name?.trim() && m.dosage?.trim());
  }, [data.medications]);

  return { data, setData, notes, setNotes, nextVisitDays, setNextVisitDays, onChange, getValidMedications };
}

export const PrescriptionStandaloneScreen: React.FC<PrescriptionStandaloneScreenProps> = ({
  clientId,
  prescriptionId,
  appointmentId,
}) => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const isDoctor = currentUser?.roles?.includes('DOCTOR') || false;
  const isEditMode = !!prescriptionId;

  return isEditMode ? (
    <EditModeContent tenantId={tenantId} prescriptionId={prescriptionId!} isDoctor={isDoctor} router={router} />
  ) : (
    <CreateModeContent tenantId={tenantId} clientId={clientId} appointmentId={appointmentId} router={router} />
  );
};

// ─────────────────────────────── Edit mode ──────────────────────────────

const EditModeContent: React.FC<{
  tenantId: string;
  prescriptionId: string;
  isDoctor: boolean;
  router: ReturnType<typeof useRouter>;
}> = ({ tenantId, prescriptionId, isDoctor, router }) => {
  const { data: prescription, isLoading, isError, error, refetch } = usePrescriptionDetailQuery(tenantId, prescriptionId);
  const updateMutation = useUpdatePrescriptionMutation(tenantId, prescriptionId);
  const draft = usePrescriptionDraft();

  useEffect(() => {
    if (!prescription) return;
    draft.setData({
      medications: prescription.prescription_data?.medications || [],
      dietary_advice: prescription.prescription_data?.dietary_advice,
      lifestyle_advice: prescription.prescription_data?.lifestyle_advice,
    });
    draft.setNotes(prescription.notes || '');
    // Only re-sync when a different prescription loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescription?.id]);

  const handleSave = useCallback(async () => {
    const validMedications = draft.getValidMedications();
    if (validMedications.length === 0) return;

    try {
      await updateMutation.mutateAsync({
        prescription_data: {
          medications: validMedications,
          dietary_advice: draft.data.dietary_advice,
          lifestyle_advice: draft.data.lifestyle_advice,
        },
        notes: draft.notes || undefined,
      });
      Alert.alert('Success', 'Prescription updated successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update prescription.';
      if (errorMessage.includes('DOCTOR')) {
        Alert.alert('Permission Denied', 'Only doctors can edit signed prescriptions.');
      } else if (errorMessage.includes('FINAL')) {
        Alert.alert('Cannot Edit', 'Final prescriptions cannot be edited.');
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  }, [updateMutation, draft, router]);

  const handleCancel = useCallback(() => {
    Alert.alert('Discard Changes', 'Are you sure you want to discard your changes?', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [router]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID="standalone-prescription-back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Edit Prescription</Text>
        <Text style={styles.headerSubtitle}>v{prescription?.document_version || 1}</Text>
      </View>
      {prescription && <PrescriptionStatusBadge status={prescription.status} size="medium" />}
    </View>
  );

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Loading prescription...</Text>
      </View>
    );
  } else if (isError || !prescription) {
    content = (
      <EmptyPrescriptionsState
        variant="error"
        title="Unable to Load Prescription"
        message={
          error?.message?.includes('401')
            ? 'Authentication failed. Please try logging in again.'
            : 'Could not load this prescription. Please try again.'
        }
        actionLabel="Retry"
        onActionPress={() => refetch()}
      />
    );
  } else {
    const canEdit = isEditable(prescription.status) || (prescription.status === 'SIGNED' && isDoctor);
    if (!canEdit) {
      content = (
        <EmptyPrescriptionsState
          variant="error"
          title="Cannot Edit Prescription"
          message={
            prescription.status === 'FINAL'
              ? 'Final prescriptions cannot be edited.'
              : 'Only doctors can edit signed prescriptions.'
          }
          actionLabel="Go Back"
          onActionPress={() => router.back()}
        />
      );
    } else {
      content = (
        <ScrollView contentContainerStyle={styles.scrollContent} testID="standalone-prescription-form">
          <PrescriptionEditingCore
            prescriptionData={draft.data}
            onChange={draft.onChange}
            onSave={handleSave}
            isSaving={updateMutation.isPending}
            saveError={null}
            progress="empty"
            saveStatus="idle"
            activeAdviceFields={EDIT_MODE_ADVICE_FIELDS}
            notes={draft.notes}
            onNotesChange={draft.setNotes}
          />
        </ScrollView>
      );
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <View style={styles.content}>{content}</View>
    </SafeAreaView>
  );
};

// ────────────────────────────── Create mode ─────────────────────────────

const CreateModeContent: React.FC<{
  tenantId: string;
  clientId: string;
  appointmentId?: string;
  router: ReturnType<typeof useRouter>;
}> = ({ tenantId, clientId, appointmentId, router }) => {
  const createMutation = useCreatePrescriptionMutation(tenantId);
  const draft = usePrescriptionDraft(CREATE_MODE_INITIAL_DATA);

  const { data: appointment } = useAppointmentDetailQuery(tenantId, appointmentId || '', { enabled: !!appointmentId });
  const episodeId = appointment?.episode_id;
  const { data: episode } = useEpisodeQuery(tenantId, episodeId || '', { enabled: !!episodeId });

  const handleSave = useCallback(async () => {
    const validMedications = draft.getValidMedications();
    if (validMedications.length === 0) return;

    try {
      const result = await createMutation.mutateAsync({
        client_id: clientId,
        prescription_data: {
          medications: validMedications,
          dietary_advice: draft.data.dietary_advice,
          lifestyle_advice: draft.data.lifestyle_advice,
        },
        notes: draft.notes || undefined,
        next_visit_days: draft.nextVisitDays ? parseInt(draft.nextVisitDays, 10) : undefined,
        appointment_id: appointmentId,
        episode_id: episodeId || undefined,
      });

      router.replace({
        pathname: '/clinic-admin/clients/[clientId]/prescriptions/[prescriptionId]' as any,
        params: { clientId, prescriptionId: result.id },
      });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail?.error === 'PRESCRIPTION_ALREADY_EXISTS' && detail?.prescription_id) {
        Alert.alert('Prescription Already Exists', detail.message || 'This visit already has a prescription.', [
          {
            text: 'View Prescription',
            onPress: () =>
              router.replace({
                pathname: '/clinic-admin/clients/[clientId]/prescriptions/[prescriptionId]' as any,
                params: { clientId, prescriptionId: detail.prescription_id },
              }),
          },
        ]);
        return;
      }
      if (err.error_code === 'EPISODE_MISMATCH' || err.message?.includes('episode_id must match')) {
        Alert.alert('Episode Mismatch', 'Document episode must match appointment episode. Please try again.', [
          { text: 'OK' },
        ]);
      } else {
        Alert.alert('Error', err.message || 'Failed to create prescription.');
      }
    }
  }, [createMutation, clientId, appointmentId, episodeId, draft, router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID="standalone-prescription-create-back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>New Prescription</Text>
        {episode ? (
          <View style={styles.episodeContext}>
            <Ionicons name="folder-outline" size={14} color={colors.primary.main} />
            <Text style={styles.episodeContextText}>Episode: {episode.title}</Text>
          </View>
        ) : (
          <Text style={styles.headerSubtitle}>Create a new prescription</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContent} testID="standalone-prescription-form">
          <PrescriptionEditingCore
            prescriptionData={draft.data}
            onChange={draft.onChange}
            onSave={handleSave}
            isSaving={createMutation.isPending}
            saveError={null}
            progress="empty"
            saveStatus="idle"
            activeAdviceFields={CREATE_MODE_ADVICE_FIELDS}
            notes={draft.notes}
            onNotesChange={draft.setNotes}
            nextVisitDays={draft.nextVisitDays}
            onNextVisitDaysChange={draft.setNextVisitDays}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: { padding: spacing.xs, marginRight: spacing.sm },
  headerTitleContainer: { flex: 1 },
  headerTitle: { ...typography.h5, color: colors.text.primary },
  headerSubtitle: { ...typography.caption, color: colors.text.secondary },
  episodeContext: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  episodeContextText: { ...typography.caption, color: colors.primary.main, fontWeight: '600' },
  content: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { ...typography.body2, color: colors.text.secondary, marginTop: spacing.md },
});

export default PrescriptionStandaloneScreen;
