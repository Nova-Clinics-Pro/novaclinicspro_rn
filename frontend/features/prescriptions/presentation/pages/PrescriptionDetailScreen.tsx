/**
 * Prescription Detail Screen
 * Displays detailed view of a single prescription with share functionality
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { ClinicalPrintPreviewModal } from '../../../../core/clinicalPrint/ClinicalPrintPreviewModal';
import { buildPrescriptionPrintHtml } from '../../../../core/clinicalPrint/adapters';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  usePrescriptionDetailQuery,
  useUpdatePrescriptionMutation,
  useDeletePrescriptionMutation,
  useSharePrescriptionMutation,
  usePrescriptionPrintMutation,
} from '../../data/repositories/prescriptions.repository.impl';
import {
  PrescriptionShareRequest,
  formatDateTime,
  formatMedication,
  isEditable,
  canShare,
  getAllowedTransitions,
} from '../../data/models/prescriptions.dtos';
import { PrescriptionStatusBadge } from '../components/PrescriptionStatusBadge';
import { PrescriptionShareModal } from '../components/PrescriptionShareModal';
import { EmptyPrescriptionsState } from '../components/EmptyPrescriptionsState';

export const PrescriptionDetailScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string; prescriptionId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const clientId = params.clientId;
  const prescriptionId = params.prescriptionId || '';

  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printHtmlContent, setPrintHtmlContent] = useState('');

  const {
    data: prescription,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = usePrescriptionDetailQuery(tenantId, prescriptionId);

  const updateMutation = useUpdatePrescriptionMutation(tenantId, prescriptionId);
  const deleteMutation = useDeletePrescriptionMutation(tenantId, prescriptionId);
  const shareMutation = useSharePrescriptionMutation(tenantId, prescriptionId);
  const printMutation = usePrescriptionPrintMutation(tenantId, prescriptionId);

  const handleStatusTransition = useCallback(async (newStatus: string) => {
    try {
      await updateMutation.mutateAsync({ status: newStatus as any });
      Alert.alert('Success', `Prescription ${newStatus.toLowerCase()} successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update prescription status.');
    }
  }, [updateMutation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Prescription',
      'Are you sure you want to delete this prescription? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync();
              Alert.alert('Success', 'Prescription deleted successfully.');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete prescription.');
            }
          },
        },
      ]
    );
  }, [deleteMutation, router]);

  const handleShare = useCallback(async (request: PrescriptionShareRequest) => {
    try {
      const result = await shareMutation.mutateAsync(request);
      setShowShareModal(false);
      if (result.success) {
        Alert.alert('Success', `Prescription shared via ${request.channel} successfully.`);
      } else {
        Alert.alert('Error', result.error || 'Failed to share prescription.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to share prescription.');
    }
  }, [shareMutation]);

  const handlePrint = useCallback(async () => {
    try {
      const printData = await printMutation.mutateAsync();
      setPrintHtmlContent(buildPrescriptionPrintHtml(printData));
      setShowPrintPreview(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to prepare prescription for print.');
    }
  }, [printMutation]);

  const handleEdit = useCallback(() => {
    if (clientId) {
      router.push({
        pathname: '/clinic-admin/clients/[clientId]/prescriptions/[prescriptionId]/edit' as any,
        params: { clientId, prescriptionId },
      });
    } else {
      router.push({
        pathname: '/clinic-admin/prescriptions/[prescriptionId]/edit' as any,
        params: { prescriptionId },
      });
    }
  }, [router, clientId, prescriptionId]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Prescription</Text>
        <Text style={styles.headerSubtitle}>v{prescription?.document_version || 1}</Text>
      </View>
      {prescription && (
        <PrescriptionStatusBadge status={prescription.status} size="medium" />
      )}
    </View>
  );

  const renderActions = () => {
    if (!prescription) return null;

    const allowedTransitions = getAllowedTransitions(prescription.status);
    const isShareable = canShare(prescription.status);
    const isEditableStatus = isEditable(prescription.status);

    return (
      <View style={styles.actionsContainer}>
        <Text style={styles.actionsTitle}>Actions</Text>
        <View style={styles.actionsRow}>
          {/* Status Transitions */}
          {allowedTransitions.map((newStatus) => (
            <TouchableOpacity
              key={newStatus}
              style={[
                styles.actionButton,
                newStatus === 'SIGNED' ? styles.signButton : styles.finalizeButton,
              ]}
              onPress={() => {
                Alert.alert(
                  `Confirm ${newStatus === 'SIGNED' ? 'Sign' : 'Finalize'}`,
                  newStatus === 'SIGNED'
                    ? 'Once signed, this prescription cannot be edited. Continue?'
                    : 'This will finalize the prescription. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Confirm', onPress: () => handleStatusTransition(newStatus) },
                  ]
                );
              }}
              disabled={updateMutation.isPending}
            >
              <Ionicons
                name={newStatus === 'SIGNED' ? 'shield-checkmark' : 'checkmark-circle'}
                size={18}
                color={colors.background.default}
              />
              <Text style={styles.actionButtonText}>
                {newStatus === 'SIGNED' ? 'Sign' : 'Finalize'}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Edit Button */}
          {isEditableStatus && (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary.main} />
              <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
            </TouchableOpacity>
          )}

          {/* Share Button */}
          {isShareable && (
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="share-outline" size={18} color={colors.background.default} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.printButton]}
            onPress={handlePrint}
            disabled={printMutation.isPending}
          >
            <Ionicons name="print-outline" size={18} color={colors.text.primary} />
            <Text style={[styles.actionButtonText, styles.printButtonText]}>Print</Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error.main} />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading prescription...</Text>
        </View>
      );
    }

    if (isError || !prescription) {
      return (
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
    }

    const medications = prescription.prescription_data?.medications || [];

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Document Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{formatDateTime(prescription.created_at)}</Text>
          </View>
          {prescription.signed_at && (
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success.main} />
              <Text style={styles.infoLabel}>Signed:</Text>
              <Text style={[styles.infoValue, { color: colors.success.main }]}>
                {formatDateTime(prescription.signed_at)}
              </Text>
            </View>
          )}
          {prescription.next_visit_days && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={colors.info.main} />
              <Text style={styles.infoLabel}>Follow-up:</Text>
              <Text style={[styles.infoValue, { color: colors.info.main }]}>
                In {prescription.next_visit_days} days
              </Text>
            </View>
          )}
        </View>

        {/* Medications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medkit" size={20} color={colors.primary.main} />
            <Text style={styles.sectionTitle}>
              Medications ({medications.length})
            </Text>
          </View>
          {medications.map((med, index) => (
            <View key={index} style={styles.medicationCard}>
              <Text style={styles.medicationName}>{med.name}</Text>
              <Text style={styles.medicationDetails}>
                {formatMedication(med)}
              </Text>
              {med.instructions && (
                <Text style={styles.medicationInstructions}>
                  • {med.instructions}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Dietary Advice */}
        {prescription.prescription_data?.dietary_advice && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="nutrition-outline" size={20} color={colors.success.main} />
              <Text style={styles.sectionTitle}>Dietary Advice</Text>
            </View>
            <Text style={styles.adviceText}>
              {prescription.prescription_data.dietary_advice}
            </Text>
          </View>
        )}

        {/* Lifestyle Advice */}
        {prescription.prescription_data?.lifestyle_advice && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="fitness-outline" size={20} color={colors.info.main} />
              <Text style={styles.sectionTitle}>Lifestyle Advice</Text>
            </View>
            <Text style={styles.adviceText}>
              {prescription.prescription_data.lifestyle_advice}
            </Text>
          </View>
        )}

        {/* Notes */}
        {prescription.notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.adviceText}>{prescription.notes}</Text>
          </View>
        )}

        {/* Actions */}
        {renderActions()}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <View style={styles.content}>
        {renderContent()}
      </View>
      
      {/* Share Modal */}
      <PrescriptionShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShare}
        isLoading={shareMutation.isPending}
      />
      <ClinicalPrintPreviewModal
        visible={showPrintPreview}
        html={printHtmlContent}
        title="Prescription Preview"
        onClose={() => setShowPrintPreview(false)}
      />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  infoValue: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  medicationCard: {
    backgroundColor: colors.background.paper,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  medicationName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  medicationDetails: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  medicationInstructions: {
    ...typography.caption,
    color: colors.info.main,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  adviceText: {
    ...typography.body1,
    color: colors.text.primary,
    lineHeight: 22,
  },
  actionsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionsTitle: {
    ...typography.body1,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
  finalizeButton: {
    backgroundColor: colors.info.main,
  },
  signButton: {
    backgroundColor: colors.success.main,
  },
  editButton: {
    backgroundColor: colors.primary.main + '15',
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  editButtonText: {
    color: colors.primary.main,
  },
  shareButton: {
    backgroundColor: colors.primary.main,
  },
  printButton: {
    backgroundColor: colors.grey[100],
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  printButtonText: {
    color: colors.text.primary,
  },
  deleteButton: {
    backgroundColor: colors.error.main + '15',
    borderWidth: 1,
    borderColor: colors.error.main,
  },
  deleteButtonText: {
    color: colors.error.main,
  },
});

export default PrescriptionDetailScreen;
