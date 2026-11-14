/**
 * Treatment Session Detail Screen
 * Displays detailed info for a single treatment session
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  useTreatmentSessionDetailQuery,
  useUpdateTreatmentSessionMutation,
  useStartTreatmentSessionMutation,
  useCompleteTreatmentSessionMutation,
  useDeleteTreatmentSessionMutation,
} from '../../data/repositories/treatmentSessions.repository.impl';
import { TREATMENT_SESSION_LIFECYCLE_ACTIONS_AVAILABLE } from '../../domain/sessionLifecycleAvailability';
import {
  getSessionStatusLabel,
  getSessionStatusColor,
  formatDateTime,
  formatTime,
  calculateSessionDuration,
  formatDuration,
} from '../../data/models/treatmentSessions.dtos';

export const TreatmentSessionDetailScreen: React.FC = () => {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [observations, setObservations] = useState('');
  const [progressNotes, setProgressNotes] = useState('');

  // Queries
  const {
    data: session,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useTreatmentSessionDetailQuery(tenantId, sessionId || '');

  // Mutations
  const updateMutation = useUpdateTreatmentSessionMutation(tenantId, sessionId || '');
  const startMutation = useStartTreatmentSessionMutation(tenantId);
  const completeMutation = useCompleteTreatmentSessionMutation(tenantId, sessionId || '');
  const deleteMutation = useDeleteTreatmentSessionMutation(tenantId);

  const handleStart = useCallback(async () => {
    Alert.alert(
      'Start Session',
      'Are you sure you want to start this treatment session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              await startMutation.mutateAsync(sessionId || '');
              Alert.alert('Success', 'Session started');
              refetch();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to start session');
            }
          },
        },
      ]
    );
  }, [startMutation, sessionId, refetch]);

  const handleComplete = useCallback(async () => {
    try {
      await completeMutation.mutateAsync({
        observations: observations || undefined,
        progress_notes: progressNotes || undefined,
      });
      setShowCompleteModal(false);
      Alert.alert('Success', 'Session completed');
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete session');
    }
  }, [completeMutation, observations, progressNotes, refetch]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(sessionId || '');
              Alert.alert('Success', 'Session deleted');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete session');
            }
          },
        },
      ]
    );
  }, [deleteMutation, sessionId, router]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError || !session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error.main} />
          <Text style={styles.errorTitle}>Could not load session</Text>
          <Text style={styles.errorText}>
            {error?.message || 'Session not found'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getSessionStatusColor(session.status);
  const duration = calculateSessionDuration(session.scheduled_start, session.scheduled_end);
  const actualDuration = calculateSessionDuration(session.actual_start, session.actual_end);
  const canStart = TREATMENT_SESSION_LIFECYCLE_ACTIONS_AVAILABLE && session.status === 'scheduled';
  const canComplete = TREATMENT_SESSION_LIFECYCLE_ACTIONS_AVAILABLE && session.status === 'in_progress';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={20} color={colors.error.main} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary.main]}
          />
        }
      >
        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: statusColor }]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getSessionStatusLabel(session.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.treatmentTitle}>
            {session.treatment_name || 'Treatment Session'}
          </Text>
          <View style={styles.timeRow}>
            <Ionicons name="time" size={20} color={colors.text.secondary} />
            <Text style={styles.timeText}>
              {formatTime(session.scheduled_start)}
              {!!session.scheduled_end && ` - ${formatTime(session.scheduled_end)}`}
            </Text>
            {!!duration && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{formatDuration(duration)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {(canStart || canComplete) && (
          <View style={styles.actionButtons}>
            {canStart && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStart}
              >
                <Ionicons name="play-circle" size={24} color={colors.background.default} />
                <Text style={styles.startButtonText}>Start Session</Text>
              </TouchableOpacity>
            )}
            {canComplete && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => {
                  setObservations(session.observations || '');
                  setProgressNotes(session.progress_notes || '');
                  setShowCompleteModal(true);
                }}
              >
                <Ionicons name="checkmark-circle" size={24} color={colors.background.default} />
                <Text style={styles.completeButtonText}>Complete Session</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Client & Staff Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color={colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Client</Text>
                <Text style={styles.infoValue}>
                  {session.client_name || `Client #${session.client_id.slice(0, 8)}...`}
                </Text>
              </View>
            </View>
            {!!session.therapist_name && (
              <View style={styles.infoRow}>
                <Ionicons name="medkit" size={20} color={colors.primary.main} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Therapist</Text>
                  <Text style={styles.infoValue}>{session.therapist_name}</Text>
                </View>
              </View>
            )}
            {!!session.room_name && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Room</Text>
                  <Text style={styles.infoValue}>{session.room_name}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Actual Times (if started/completed) */}
        {!!((session.actual_start || session.actual_end)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actual Times</Text>
            <View style={styles.infoCard}>
              {!!session.actual_start && (
                <View style={styles.infoRow}>
                  <Ionicons name="play" size={20} color={colors.success.main} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Started</Text>
                    <Text style={styles.infoValue}>{formatDateTime(session.actual_start)}</Text>
                  </View>
                </View>
              )}
              {!!session.actual_end && (
                <View style={styles.infoRow}>
                  <Ionicons name="stop" size={20} color={colors.error.main} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Ended</Text>
                    <Text style={styles.infoValue}>{formatDateTime(session.actual_end)}</Text>
                  </View>
                </View>
              )}
              {!!actualDuration && (
                <View style={styles.infoRow}>
                  <Ionicons name="timer" size={20} color={colors.text.secondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Actual Duration</Text>
                    <Text style={styles.infoValue}>{formatDuration(actualDuration)}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Notes */}
        {!!session.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{session.notes}</Text>
            </View>
          </View>
        )}

        {/* Observations */}
        {!!session.observations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observations</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{session.observations}</Text>
            </View>
          </View>
        )}

        {/* Progress Notes */}
        {!!session.progress_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progress Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{session.progress_notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Complete Session Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Session</Text>
            <Text style={styles.modalSubtitle}>
              Add any observations or progress notes before completing
            </Text>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Observations</Text>
              <TextInput
                style={styles.modalInput}
                value={observations}
                onChangeText={setObservations}
                placeholder="Enter observations..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Progress Notes</Text>
              <TextInput
                style={styles.modalInput}
                value={progressNotes}
                onChangeText={setProgressNotes}
                placeholder="Enter progress notes..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCompleteButton}
                onPress={handleComplete}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.background.default} />
                ) : (
                  <Text style={styles.modalCompleteText}>Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.grey[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  statusCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.body2,
    fontWeight: '600',
  },
  treatmentTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeText: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  durationBadge: {
    backgroundColor: colors.grey[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  actionButtons: {
    marginBottom: spacing.md,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.success.main,
  },
  startButtonText: {
    ...typography.button,
    color: colors.background.default,
    fontSize: 16,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primary.main,
  },
  completeButtonText: {
    ...typography.button,
    color: colors.background.default,
    fontSize: 16,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.body1,
    color: colors.text.primary,
  },
  notesCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
  },
  notesText: {
    ...typography.body1,
    color: colors.text.primary,
    lineHeight: 22,
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
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background.default,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  modalField: {
    marginBottom: spacing.md,
  },
  modalLabel: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: colors.grey[50],
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 80,
    ...typography.body1,
    color: colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.main,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.button,
    color: colors.text.primary,
  },
  modalCompleteButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
  },
  modalCompleteText: {
    ...typography.button,
    color: colors.background.default,
  },
});

export default TreatmentSessionDetailScreen;
