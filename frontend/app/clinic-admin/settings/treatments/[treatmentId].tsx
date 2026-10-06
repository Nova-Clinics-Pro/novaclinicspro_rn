/**
 * Treatment Detail Route
 * /clinic-admin/settings/treatments/[treatmentId]
 * 
 * Features:
 * - View all treatment details
 * - Edit treatment with "no changes = no API call" pattern (Issue #7)
 * - Toggle active status
 * - Delete treatment
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import {
  useTreatmentDetailQuery,
  useUpdateTreatmentMutation,
} from '../../../../features/treatments/data/repositories/treatments.repository.impl';
import { useFeatures, isAyurvedaClinic as checkIsAyurveda } from '../../../../core/hooks/useFeatures';
import { 
  formatPrice, 
  formatDuration, 
  DOSHA_COLORS,
  TreatmentUpdate,
} from '../../../../features/treatments/data/models/treatments.dtos';
import { TreatmentForm } from '../../../../features/treatments/presentation/components/TreatmentForm';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuthStore } from '../../../../features/auth/presentation/providers/auth.store';

export default function TreatmentDetailScreen() {
  const router = useRouter();
  const { treatmentId } = useLocalSearchParams<{ treatmentId: string }>();
  const { currentUser } = useAuthStore();
  const tenantId = currentUser?.tenantId || '';

  const [isEditing, setIsEditing] = useState(false);

  const treatmentQuery = useTreatmentDetailQuery(tenantId, treatmentId || '', {
    enabled: !!tenantId && !!treatmentId,
  });

  // Get feature configuration from JWT token
  const features = useFeatures();

  const updateMutation = useUpdateTreatmentMutation(tenantId, treatmentId || '');

  // Check if clinic is Ayurveda type using feature flags from JWT
  const isAyurvedaClinic = checkIsAyurveda(features);

  const handleToggleActive = useCallback(async () => {
    if (!treatmentQuery.data) return;
    const newStatus = !treatmentQuery.data.is_active;
    try {
      await updateMutation.mutateAsync({ is_active: newStatus });
      Alert.alert('Success', `Treatment ${newStatus ? 'activated' : 'deactivated'}`);
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  }, [treatmentQuery.data, updateMutation]);

  const handleEditSubmit = useCallback(async (data: TreatmentUpdate, hasChanges: boolean) => {
    // Issue #7: Don't call API if nothing changed
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    try {
      await updateMutation.mutateAsync(data);
      setIsEditing(false);
      Alert.alert('Success', 'Treatment updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update treatment');
    }
  }, [updateMutation]);

  if (treatmentQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader
          title="Treatment Details"
          subtitle="Loading..."
          onBackPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading treatment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (treatmentQuery.isError || !treatmentQuery.data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader
          title="Treatment Details"
          subtitle="Error"
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load treatment</Text>
        </View>
      </SafeAreaView>
    );
  }

  const treatment = treatmentQuery.data;
  const effectivePrice = treatment.price || treatment.base_price;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title={treatment.name}
        subtitle={treatment.code}
        onBackPress={() => router.back()}
        rightAction={
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color="#2F6F4E" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusInfo}>
            <View style={[
              styles.statusDot,
              { backgroundColor: treatment.is_active ? '#10B981' : '#EF4444' }
            ]} />
            <Text style={styles.statusText}>
              {treatment.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.statusButton, !treatment.is_active && styles.activateButton]}
            onPress={handleToggleActive}
          >
            <Text style={[styles.statusButtonText, !treatment.is_active && styles.activateButtonText]}>
              {treatment.is_active ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Ionicons name="time-outline" size={24} color="#2F6F4E" />
              <Text style={styles.overviewValue}>
                {formatDuration(treatment.duration_minutes)}
              </Text>
              <Text style={styles.overviewLabel}>Duration</Text>
            </View>
            <View style={styles.overviewItem}>
              <Ionicons name="pricetag-outline" size={24} color="#C28A4B" />
              <Text style={styles.overviewValue}>
                {formatPrice(effectivePrice)}
              </Text>
              <Text style={styles.overviewLabel}>Price</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {treatment.description || 'No description provided'}
          </Text>
        </View>

        {/* Ayurvedic Properties - Only show for Ayurveda clinics */}
        {isAyurvedaClinic && treatment.dosha_benefits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ayurvedic Properties</Text>
            
            {treatment.dosha_benefits?.vata?.balances ? (
              <View style={styles.doshaItem}>
                <View style={[styles.doshaIndicator, { backgroundColor: DOSHA_COLORS.vata }]} />
                <View style={styles.doshaContent}>
                  <Text style={styles.doshaName}>Balances Vata</Text>
                  {treatment.dosha_benefits.vata.notes && (
                    <Text style={styles.doshaNote}>{treatment.dosha_benefits.vata.notes}</Text>
                  )}
                </View>
              </View>
            ) : null}
            
            {treatment.dosha_benefits?.pitta?.balances ? (
              <View style={styles.doshaItem}>
                <View style={[styles.doshaIndicator, { backgroundColor: DOSHA_COLORS.pitta }]} />
                <View style={styles.doshaContent}>
                  <Text style={styles.doshaName}>Balances Pitta</Text>
                  {treatment.dosha_benefits.pitta.notes && (
                    <Text style={styles.doshaNote}>{treatment.dosha_benefits.pitta.notes}</Text>
                  )}
                </View>
              </View>
            ) : null}
            
            {treatment.dosha_benefits?.kapha?.balances ? (
              <View style={styles.doshaItem}>
                <View style={[styles.doshaIndicator, { backgroundColor: DOSHA_COLORS.kapha }]} />
                <View style={styles.doshaContent}>
                  <Text style={styles.doshaName}>Balances Kapha</Text>
                  {treatment.dosha_benefits.kapha.notes && (
                    <Text style={styles.doshaNote}>{treatment.dosha_benefits.kapha.notes}</Text>
                  )}
                </View>
              </View>
            ) : null}

            {!treatment.dosha_benefits?.vata?.balances && 
             !treatment.dosha_benefits?.pitta?.balances && 
             !treatment.dosha_benefits?.kapha?.balances && (
              <Text style={styles.emptyText}>No Ayurvedic properties specified</Text>
            )}
          </View>
        )}

        {/* Contraindications */}
        <View style={[styles.section, treatment.contraindications && styles.warningSection]}>
          <View style={styles.warningHeader}>
            <Ionicons 
              name="warning-outline" 
              size={20} 
              color={treatment.contraindications ? '#D97706' : '#9CA3AF'} 
            />
            <Text style={[
              styles.warningTitle,
              !treatment.contraindications && styles.emptyWarningTitle
            ]}>
              Contraindications
            </Text>
          </View>
          <Text style={[
            styles.warningText,
            !treatment.contraindications && styles.emptyText
          ]}>
            {treatment.contraindications || 'No contraindications specified'}
          </Text>
        </View>

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Created</Text>
            <Text style={styles.metaValue}>
              {new Date(treatment.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Last Updated</Text>
            <Text style={styles.metaValue}>
              {new Date(treatment.updated_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>ID</Text>
            <Text style={styles.metaValue}>{treatment.id}</Text>
          </View>
        </View>

        {/* End of scroll content */}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditing(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <DashboardHeader
            title="Edit Treatment"
            subtitle={treatment.code}
            onBackPress={() => setIsEditing(false)}
          />
          <TreatmentForm
            initialData={treatment}
            mode="edit"
            onSubmit={handleEditSubmit}
            onCancel={() => setIsEditing(false)}
            isLoading={updateMutation.isPending}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body1,
    color: '#1F2937',
    marginTop: spacing.md,
  },
  editButton: {
    padding: spacing.xs,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  activateButton: {
    backgroundColor: '#F0FDF4',
  },
  statusButtonText: {
    ...typography.body2,
    fontWeight: '600',
    color: '#EF4444',
  },
  activateButtonText: {
    color: '#10B981',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    ...typography.h6,
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: spacing.md,
  },
  overviewValue: {
    ...typography.h5,
    color: '#1F2937',
    marginTop: spacing.xs,
  },
  overviewLabel: {
    ...typography.caption,
    color: '#6B7280',
  },
  description: {
    ...typography.body2,
    color: '#4B5563',
    lineHeight: 22,
  },
  emptyText: {
    ...typography.body2,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  doshaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  doshaIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
    marginTop: 4,
  },
  doshaContent: {
    flex: 1,
  },
  doshaName: {
    ...typography.body2,
    fontWeight: '600',
    color: '#1F2937',
  },
  doshaNote: {
    ...typography.caption,
    color: '#6B7280',
    marginTop: 2,
  },
  warningSection: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  warningTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: '#92400E',
  },
  emptyWarningTitle: {
    color: '#6B7280',
  },
  warningText: {
    ...typography.body2,
    color: '#78350F',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metaLabel: {
    ...typography.body2,
    color: '#6B7280',
  },
  metaValue: {
    ...typography.body2,
    color: '#1F2937',
  },
  dangerSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dangerTitle: {
    ...typography.body2,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteButtonText: {
    ...typography.body2,
    color: '#EF4444',
  },
});
