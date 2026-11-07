import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../../core/theme/spacing';
import { TreatmentLifecycleStatus, TreatmentOrderResponse } from '../../../data/models/treatmentOrders.dtos';
import { ClinicalReviewOutcome } from '../../../data/datasources/treatmentOrders.api';

interface PendingMutation {
  isPending?: boolean;
}

interface Props {
  treatmentOrder?: TreatmentOrderResponse;
  /** Phase 4 (R4) · T-E.6 (ADR-R4-07) — Clinical Review is DOCTOR-only,
   * mirroring T-E.4/T-E.5's own isDoctor gates. */
  isDoctor: boolean;
  onAddNote: (notesJson: Record<string, unknown>) => void;
  addNoteMutation: PendingMutation;
  onRecordOutcome: (outcome: ClinicalReviewOutcome, notesJson: Record<string, unknown>) => void;
  recordOutcomeMutation: PendingMutation;
}

/** Phase 4 (R4) · T-E.6 (ADR-R4-07) — Clinical Review is only offered once
 * the resolver itself has surfaced the plan as awaiting review. Outside this
 * window the same actions have no meaning (nothing to review yet, or the
 * review is already closed). */
const REVIEWABLE_LIFECYCLE_STATUSES: ReadonlySet<TreatmentLifecycleStatus> = new Set([
  'needs_clinical_review',
  'under_clinical_review',
]);

const OUTCOME_OPTIONS: { value: ClinicalReviewOutcome; label: string; description: string }[] = [
  { value: 'continue_unchanged', label: 'Continue Unchanged', description: 'No change to the remaining plan. Stays In Therapy.' },
  { value: 'update_future_rows', label: 'Update Future Sessions', description: 'Edit remaining days below using the row editor. Stays In Therapy.' },
  { value: 'extend', label: 'Extend Treatment', description: 'Add more sessions to this plan. Stays In Therapy.' },
  { value: 'stop_remaining', label: 'Stop Remaining Sessions', description: 'Cancels all remaining sessions. Marks the plan Treatment Complete.' },
  { value: 'mark_complete', label: 'Mark Complete', description: 'All sessions finished as planned. Marks the plan Treatment Complete.' },
];

const TERMINAL_OUTCOMES: ReadonlySet<ClinicalReviewOutcome> = new Set(['stop_remaining', 'mark_complete']);

export const ClinicalReviewSection: React.FC<Props> = ({
  treatmentOrder,
  isDoctor,
  onAddNote,
  addNoteMutation,
  onRecordOutcome,
  recordOutcomeMutation,
}) => {
  const theme = useClinicTheme();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [outcomeNoteText, setOutcomeNoteText] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState<ClinicalReviewOutcome | null>(null);

  // Admin (and any non-Doctor role) never sees Clinical Review at all --
  // mirrors OrderStateAction's own isDoctor gate in TreatmentLifecycleActions.
  if (!isDoctor || !treatmentOrder) return null;
  if (treatmentOrder.lifecycle_status_unresolved || !treatmentOrder.lifecycle_status) return null;
  if (!REVIEWABLE_LIFECYCLE_STATUSES.has(treatmentOrder.lifecycle_status)) return null;

  const closeNoteModal = () => {
    setShowNoteModal(false);
    setNoteText('');
  };

  const closeOutcomeModal = () => {
    setShowOutcomeModal(false);
    setSelectedOutcome(null);
    setOutcomeNoteText('');
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    onAddNote({ observation: noteText.trim() });
    closeNoteModal();
  };

  const handleConfirmOutcome = () => {
    if (!selectedOutcome) return;
    const notesJson = outcomeNoteText.trim() ? { observation: outcomeNoteText.trim() } : {};
    const proceed = () => {
      onRecordOutcome(selectedOutcome, notesJson);
      closeOutcomeModal();
    };

    if (TERMINAL_OUTCOMES.has(selectedOutcome)) {
      Alert.alert(
        'Confirm Outcome',
        selectedOutcome === 'stop_remaining'
          ? 'This will cancel all remaining sessions and mark the plan Treatment Complete. This cannot be undone.'
          : 'This will mark the plan Treatment Complete. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: proceed },
        ]
      );
    } else {
      proceed();
    }
  };

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.border.subtle }]}>
      <Text style={[styles.title, { color: theme.colors.text.secondary }]}>Clinical Review</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.border.default }]}
          onPress={() => setShowNoteModal(true)}
        >
          <Ionicons name="document-text-outline" size={18} color={theme.colors.text.primary} />
          <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>Add Observation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary.default }]}
          onPress={() => setShowOutcomeModal(true)}
        >
          <Ionicons name="checkmark-done-outline" size={18} color={theme.colors.primary.onPrimary} />
          <Text style={[styles.buttonText, { color: theme.colors.primary.onPrimary }]}>Record Outcome</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showNoteModal} transparent animationType="fade" onRequestClose={closeNoteModal}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: theme.colors.background.elevated }]}>
            <Text style={[styles.dialogTitle, { color: theme.colors.text.primary }]}>Add Clinical Observation</Text>
            <Text style={[styles.dialogSubtitle, { color: theme.colors.text.secondary }]}>
              This records a note only — it does not change the treatment plan or its status.
            </Text>
            <TextInput
              style={[styles.textInput, { borderColor: theme.colors.border.default, color: theme.colors.text.primary }]}
              placeholder="Clinical observation..."
              placeholderTextColor={theme.colors.text.disabled}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={4}
              editable={!addNoteMutation.isPending}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.secondaryButton, { borderColor: theme.colors.border.default }]}
                onPress={closeNoteModal}
                disabled={addNoteMutation.isPending}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogButton,
                  { backgroundColor: theme.colors.primary.default, opacity: !noteText.trim() || addNoteMutation.isPending ? 0.5 : 1 },
                ]}
                onPress={handleAddNote}
                disabled={!noteText.trim() || addNoteMutation.isPending}
              >
                {addNoteMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.primary.onPrimary} />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.colors.primary.onPrimary }]}>Save Observation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showOutcomeModal} transparent animationType="fade" onRequestClose={closeOutcomeModal}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: theme.colors.background.elevated }]}>
            <Text style={[styles.dialogTitle, { color: theme.colors.text.primary }]}>Record Clinical Review Outcome</Text>
            {OUTCOME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.outcomeOption,
                  {
                    borderColor: selectedOutcome === opt.value ? theme.colors.primary.default : theme.colors.border.default,
                    backgroundColor: selectedOutcome === opt.value ? theme.colors.primary.default + '15' : 'transparent',
                  },
                ]}
                onPress={() => setSelectedOutcome(opt.value)}
              >
                <Text style={[styles.outcomeLabel, { color: theme.colors.text.primary }]}>{opt.label}</Text>
                <Text style={[styles.outcomeDescription, { color: theme.colors.text.secondary }]}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[styles.textInput, { borderColor: theme.colors.border.default, color: theme.colors.text.primary }]}
              placeholder="Notes for this decision (optional)"
              placeholderTextColor={theme.colors.text.disabled}
              value={outcomeNoteText}
              onChangeText={setOutcomeNoteText}
              multiline
              numberOfLines={3}
              editable={!recordOutcomeMutation.isPending}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.secondaryButton, { borderColor: theme.colors.border.default }]}
                onPress={closeOutcomeModal}
                disabled={recordOutcomeMutation.isPending}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogButton,
                  { backgroundColor: theme.colors.primary.default, opacity: !selectedOutcome || recordOutcomeMutation.isPending ? 0.5 : 1 },
                ]}
                onPress={handleConfirmOutcome}
                disabled={!selectedOutcome || recordOutcomeMutation.isPending}
              >
                {recordOutcomeMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.primary.onPrimary} />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.colors.primary.onPrimary }]}>Confirm Outcome</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1 },
  title: { fontSize: 14, marginBottom: spacing.sm, fontWeight: '500' },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8 },
  secondaryButton: { borderWidth: 1 },
  buttonText: { fontSize: 14, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  dialog: { width: '100%', maxWidth: 500, borderRadius: 16, padding: spacing.lg },
  dialogTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing.xs },
  dialogSubtitle: { fontSize: 13, marginBottom: spacing.md },
  textInput: { borderWidth: 1, borderRadius: 8, padding: spacing.sm, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginTop: spacing.sm },
  dialogActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  dialogButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: 8 },
  outcomeOption: { borderWidth: 1, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
  outcomeLabel: { fontSize: 14, fontWeight: '600' },
  outcomeDescription: { fontSize: 12, marginTop: 2 },
});
