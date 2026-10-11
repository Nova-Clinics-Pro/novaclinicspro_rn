/**
 * Prescription Edit Screen
 * Screen for editing an existing prescription
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { PrescriptionOperationError } from '../../domain/errors/prescriptionOperationError';
import {
  usePrescriptionDetailQuery,
  useUpdatePrescriptionMutation,
  isEditable,
} from '../../index';
import { PrescriptionForm, PrescriptionFormData } from '../components/PrescriptionForm';
import { PrescriptionStatusBadge } from '../components/PrescriptionStatusBadge';
import { EmptyPrescriptionsState } from '../components/EmptyPrescriptionsState';

export const PrescriptionEditScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string; prescriptionId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const prescriptionId = params.prescriptionId || '';

  const isDoctor = currentUser?.roles?.includes('DOCTOR') || false;

  const {
    data: prescription,
    isLoading,
    isError,
    error,
    refetch,
  } = usePrescriptionDetailQuery(tenantId, prescriptionId);

  const updateMutation = useUpdatePrescriptionMutation(tenantId, prescriptionId);

  const handleSubmit = useCallback(async (data: PrescriptionFormData) => {
    try {
      await updateMutation.mutateAsync({
        prescription_data: {
          medications: data.medications,
          dietary_advice: data.dietary_advice,
          lifestyle_advice: data.lifestyle_advice,
        },
        notes: data.notes,
      });
      Alert.alert(
        'Success',
        'Prescription updated successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
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
  }, [updateMutation, router]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]
    );
  }, [router]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID="edit-prescription-back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Edit Prescription</Text>
        <Text style={styles.headerSubtitle}>
          v{prescription?.document_version || 1}
        </Text>
      </View>
      {prescription && (
        <PrescriptionStatusBadge status={prescription.status} size="medium" />
      )}
    </View>
  );

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
            error instanceof PrescriptionOperationError && error.kind === 'AUTHENTICATION_REQUIRED'
              ? 'Authentication failed. Please try logging in again.'
              : 'Could not load this prescription. Please try again.'
          }
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      );
    }

    const canEdit = isEditable(prescription.status) || (prescription.status === 'SIGNED' && isDoctor);

    if (!canEdit) {
      return (
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
    }

    const initialData: PrescriptionFormData = {
      medications: prescription.prescription_data?.medications || [],
      dietary_advice: prescription.prescription_data?.dietary_advice,
      lifestyle_advice: prescription.prescription_data?.lifestyle_advice,
      notes: prescription.notes || undefined,
      next_visit_days: prescription.next_visit_days || undefined,
    };

    return (
      <PrescriptionForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateMutation.isPending}
        isEditable={true}
        submitLabel="Update Prescription"
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <View style={styles.content}>
        {renderContent()}
      </View>
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
});

export default PrescriptionEditScreen;
