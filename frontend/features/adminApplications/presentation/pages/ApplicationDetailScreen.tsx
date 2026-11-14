/**
 * Tenant Application Detail Screen
 * Full detail view with review actions for Super Admin
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import {
  useApplicationQuery,
  useReviewApplicationMutation,
  useActivateApplicationMutation,
  useSuspendApplicationMutation,
  useReactivateApplicationMutation,
} from '../../data/repositories/adminApplications.repository.impl';

export default function ApplicationDetailScreen() {
  const theme = useClinicTheme();
  const router = useRouter();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewerNotes, setReviewerNotes] = useState('');

  const { data: application, isLoading, isError, error } = useApplicationQuery(applicationId);
  const reviewMutation = useReviewApplicationMutation(applicationId);
  const activateMutation = useActivateApplicationMutation(applicationId);
  const suspendMutation = useSuspendApplicationMutation(applicationId);
  const reactivateMutation = useReactivateApplicationMutation(applicationId);

  const handleReviewSubmit = async () => {
    try {
      await reviewMutation.mutateAsync({
        decision: reviewDecision,
        reviewer_notes: reviewerNotes || undefined,
      });
      setReviewModalVisible(false);
      setReviewerNotes('');
      Alert.alert('Success', `Application ${reviewDecision} successfully`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to review application');
    }
  };

  const handleAction = (
    action: 'activate' | 'suspend' | 'reactivate',
    mutation: any
  ) => {
    const actionLabels = {
      activate: 'Activate',
      suspend: 'Suspend',
      reactivate: 'Reactivate',
    };

    Alert.alert(
      `${actionLabels[action]} Application`,
      `Are you sure you want to ${action} this application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabels[action],
          style: action === 'suspend' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await mutation.mutateAsync();
              Alert.alert('Success', `Application ${action}d successfully`);
            } catch (err: any) {
              Alert.alert('Error', err.message || `Failed to ${action} application`);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      >
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary.default} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading application details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !application) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      >
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={64} color={theme.colors.feedback.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.text.primary }]}>
            Unable to Load Application
          </Text>
          <Text style={[styles.errorSubtitle, { color: theme.colors.text.secondary }]}>
            {error?.message || 'Application not found'}
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: theme.colors.primary.onPrimary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface.default }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Application Details
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View
          style={[
            styles.statusSection,
            {
              backgroundColor: theme.colors.surface.default,
              borderColor: theme.colors.border.default,
            },
          ]}
        >
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: theme.colors.text.secondary }]}>
              Status:
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    application.status === 'approved' || application.status === 'active'
                      ? theme.colors.feedback.successLight
                      : application.status === 'rejected' || application.status === 'suspended'
                      ? theme.colors.feedback.errorLight
                      : theme.colors.feedback.warningLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      application.status === 'approved' || application.status === 'active'
                        ? theme.colors.feedback.success
                        : application.status === 'rejected' ||
                          application.status === 'suspended'
                        ? theme.colors.feedback.error
                        : theme.colors.feedback.warning,
                  },
                ]}
              >
                {application.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Tenant Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Tenant Information
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
              Tenant Name:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {application.tenant_name}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
              Clinic Type:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {application.clinic_type}
            </Text>
          </View>
          {!!application.region && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                Region:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                {application.region}
              </Text>
            </View>
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Contact Information
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Name:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {application.contact_name}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Email:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {application.contact_email}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Phone:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {application.contact_phone}
            </Text>
          </View>
        </View>

        {/* Risk Assessment */}
        {application.risk_score !== undefined && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Risk Assessment
            </Text>
            <View style={styles.riskCard}>
              <View style={styles.riskHeader}>
                <Ionicons
                  name="shield-outline"
                  size={24}
                  color={
                    application.risk_score < 30
                      ? theme.colors.feedback.success
                      : application.risk_score < 70
                      ? theme.colors.feedback.warning
                      : theme.colors.feedback.error
                  }
                />
                <Text
                  style={[
                    styles.riskScore,
                    {
                      color:
                        application.risk_score < 30
                          ? theme.colors.feedback.success
                          : application.risk_score < 70
                          ? theme.colors.feedback.warning
                          : theme.colors.feedback.error,
                    },
                  ]}
                >
                  Risk Score: {application.risk_score}
                </Text>
              </View>
              {application.auto_approval_result?.risk_factors &&
                application.auto_approval_result.risk_factors.length > 0 && (
                  <View style={styles.riskFactors}>
                    <Text style={[styles.riskFactorsTitle, { color: theme.colors.text.primary }]}>
                      Risk Factors:
                    </Text>
                    {application.auto_approval_result.risk_factors.map((factor, index) => (
                      <Text
                        key={index}
                        style={[styles.riskFactor, { color: theme.colors.text.secondary }]}
                      >
                        • {factor}
                      </Text>
                    ))}
                  </View>
                )}
            </View>
          </View>
        )}

        {/* Review Information */}
        {!!application.reviewed_at && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Review Information
            </Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                Reviewed At:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                {new Date(application.reviewed_at).toLocaleString()}
              </Text>
            </View>
            {!!application.reviewer_notes && (
              <View style={styles.notesContainer}>
                <Text style={[styles.notesLabel, { color: theme.colors.text.secondary }]}>
                  Reviewer Notes:
                </Text>
                <Text style={[styles.notesText, { color: theme.colors.text.primary }]}>
                  {application.reviewer_notes}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Timestamps
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
              Submitted:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {new Date(application.submitted_at).toLocaleString()}
            </Text>
          </View>
          {!!application.activated_at && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                Activated:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                {new Date(application.activated_at).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: theme.colors.surface.default,
            borderTopColor: theme.colors.border.default,
          },
        ]}
      >
        {application.status === 'pending_review' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.feedback.success }]}
              onPress={() => {
                setReviewDecision('approved');
                setReviewModalVisible(true);
              }}
              disabled={reviewMutation.isPending}
            >
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary.onPrimary} />
              <Text style={[styles.actionButtonText, { color: theme.colors.primary.onPrimary }]}>
                Approve
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.feedback.error }]}
              onPress={() => {
                setReviewDecision('rejected');
                setReviewModalVisible(true);
              }}
              disabled={reviewMutation.isPending}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.primary.onPrimary} />
              <Text style={[styles.actionButtonText, { color: theme.colors.primary.onPrimary }]}>
                Reject
              </Text>
            </TouchableOpacity>
          </>
        )}

        {application.status === 'approved' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={() => handleAction('activate', activateMutation)}
            disabled={activateMutation.isPending}
          >
            {activateMutation.isPending ? (
              <ActivityIndicator color={theme.colors.primary.onPrimary} />
            ) : (
              <>
                <Ionicons name="rocket" size={20} color={theme.colors.primary.onPrimary} />
                <Text style={[styles.actionButtonText, { color: theme.colors.primary.onPrimary }]}>
                  Go Live
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {application.status === 'active' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.feedback.warning }]}
            onPress={() => handleAction('suspend', suspendMutation)}
            disabled={suspendMutation.isPending}
          >
            {suspendMutation.isPending ? (
              <ActivityIndicator color={theme.colors.primary.onPrimary} />
            ) : (
              <>
                <Ionicons name="pause-circle" size={20} color={theme.colors.primary.onPrimary} />
                <Text style={[styles.actionButtonText, { color: theme.colors.primary.onPrimary }]}>
                  Suspend
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {application.status === 'suspended' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.feedback.success }]}
            onPress={() => handleAction('reactivate', reactivateMutation)}
            disabled={reactivateMutation.isPending}
          >
            {reactivateMutation.isPending ? (
              <ActivityIndicator color={theme.colors.primary.onPrimary} />
            ) : (
              <>
                <Ionicons name="play-circle" size={20} color={theme.colors.primary.onPrimary} />
                <Text style={[styles.actionButtonText, { color: theme.colors.primary.onPrimary }]}>
                  Reactivate
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.surface.default,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              {reviewDecision === 'approved' ? 'Approve' : 'Reject'} Application
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.text.secondary }]}>
              Add optional notes for the {reviewDecision === 'approved' ? 'approval' : 'rejection'}
            </Text>

            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: theme.colors.background.default,
                  color: theme.colors.text.primary,
                  borderColor: theme.colors.border.default,
                },
              ]}
              placeholder="Enter reviewer notes (optional)"
              placeholderTextColor={theme.colors.text.tertiary}
              multiline
              numberOfLines={4}
              value={reviewerNotes}
              onChangeText={setReviewerNotes}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: theme.colors.background.default,
                    borderColor: theme.colors.border.default,
                  },
                ]}
                onPress={() => {
                  setReviewModalVisible(false);
                  setReviewerNotes('');
                }}
                disabled={reviewMutation.isPending}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.primary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor:
                      reviewDecision === 'approved'
                        ? theme.colors.feedback.success
                        : theme.colors.feedback.error,
                  },
                ]}
                onPress={handleReviewSubmit}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.primary.onPrimary} />
                ) : (
                  <Text
                    style={[styles.modalButtonText, { color: theme.colors.primary.onPrimary }]}
                  >
                    Confirm {reviewDecision === 'approved' ? 'Approval' : 'Rejection'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 100,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusSection: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  riskCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  riskScore: {
    fontSize: 16,
    fontWeight: '600',
  },
  riskFactors: {
    marginTop: spacing.sm,
  },
  riskFactorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  riskFactor: {
    fontSize: 14,
    marginLeft: spacing.sm,
  },
  notesContainer: {
    marginTop: spacing.sm,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionBar: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 14,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
