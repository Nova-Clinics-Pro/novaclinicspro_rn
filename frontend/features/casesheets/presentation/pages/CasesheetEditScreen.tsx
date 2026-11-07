/**
 * Casesheet Edit Screen
 * Screen for editing an existing casesheet (DRAFT status or SIGNED by DOCTOR)
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
import { CasesheetOperationError } from '../../domain/errors/casesheetOperationError';
import {
  useCasesheetDetailQuery,
  useUpdateCasesheetMutation,
  isEditable,
} from '../../index';
import { CasesheetForm, CasesheetFormData } from '../components/CasesheetForm';
import { CasesheetStatusBadge } from '../components/CasesheetStatusBadge';
import { EmptyCasesheetsState } from '../components/EmptyCasesheetsState';

export const CasesheetEditScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId: string; casesheetId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const clientId = params.clientId || '';
  const casesheetId = params.casesheetId || '';

  // Check if user has doctor role (for SIGNED casesheet editing)
  const isDoctor = currentUser?.roles?.includes('DOCTOR') || false;

  const {
    data: casesheet,
    isLoading,
    isError,
    error,
    refetch,
  } = useCasesheetDetailQuery(tenantId, casesheetId);

  const updateMutation = useUpdateCasesheetMutation(tenantId, casesheetId);

  const handleSubmit = useCallback(async (data: CasesheetFormData) => {
    try {
      await updateMutation.mutateAsync({
        data_json: data,
      });
      Alert.alert(
        'Success',
        'Casesheet updated successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      // Handle specific error cases
      const errorMessage = err.message || 'Failed to update casesheet.';
      if (errorMessage.includes('DOCTOR')) {
        Alert.alert('Permission Denied', 'Only doctors can edit signed casesheets.');
      } else if (errorMessage.includes('FINAL')) {
        Alert.alert('Cannot Edit', 'Final casesheets cannot be edited.');
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
        testID="edit-casesheet-back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Edit Casesheet</Text>
        <Text style={styles.headerSubtitle}>
          v{casesheet?.document_version || 1}
        </Text>
      </View>
      {casesheet && (
        <CasesheetStatusBadge status={casesheet.status} size="medium" />
      )}
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading casesheet...</Text>
        </View>
      );
    }

    if (isError || !casesheet) {
      return (
        <EmptyCasesheetsState
          variant="error"
          title="Unable to Load Casesheet"
          message={
            error instanceof CasesheetOperationError && error.kind === 'AUTHENTICATION_REQUIRED'
              ? 'Authentication failed. Please try logging in again.'
              : 'Could not load this casesheet. Please try again.'
          }
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      );
    }

    // Check if casesheet can be edited
    const canEdit = isEditable(casesheet.status) || (casesheet.status === 'SIGNED' && isDoctor);

    if (!canEdit) {
      return (
        <EmptyCasesheetsState
          variant="error"
          title="Cannot Edit Casesheet"
          message={
            casesheet.status === 'FINAL'
              ? 'Final casesheets cannot be edited. They can only be transitioned to Signed.'
              : 'Only doctors can edit signed casesheets.'
          }
          actionLabel="Go Back"
          onActionPress={() => router.back()}
        />
      );
    }

    // Prepare initial form data
    const initialData: CasesheetFormData = {
      basic: {
        chief_complaint: casesheet.chief_complaint || '',
        provisional_diagnosis: casesheet.provisional_diagnosis || '',
        final_diagnosis: casesheet.final_diagnosis || '',
        ...casesheet.data_json?.basic,
      },
      extensions: casesheet.data_json?.extensions || [],
    };

    return (
      <CasesheetForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateMutation.isPending}
        isEditable={true}
        submitLabel="Update Casesheet"
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

export default CasesheetEditScreen;
