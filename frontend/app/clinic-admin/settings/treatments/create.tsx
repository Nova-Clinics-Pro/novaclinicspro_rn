/**
 * Create Treatment Route
 * /clinic-admin/settings/treatments/create
 */

import React, { useCallback } from 'react';
import { Alert , StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { useCreateTreatmentMutation } from '../../../../features/treatments/data/repositories/treatments.repository.impl';
import { TreatmentForm } from '../../../../features/treatments/presentation/components/TreatmentForm';
import { TreatmentCreate, TreatmentUpdate } from '../../../../features/treatments/data/models/treatments.dtos';
import { useAuthStore } from '../../../../features/auth/presentation/providers/auth.store';

export default function CreateTreatmentScreen() {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const tenantId = currentUser?.tenantId || '';

  const createMutation = useCreateTreatmentMutation(tenantId);

  const handleCreate = useCallback(async (data: TreatmentCreate | TreatmentUpdate) => {
    if (typeof data.code !== 'string' || typeof data.name !== 'string') {
      throw new Error('Treatment creation requires a code and name');
    }

    try {
      await createMutation.mutateAsync({ ...data, code: data.code, name: data.name });
      Alert.alert('Success', 'Treatment created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create treatment');
    }
  }, [createMutation, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Add Treatment"
        subtitle="Create new service"
        onBackPress={() => router.back()}
      />
      <TreatmentForm
        mode="create"
        onSubmit={handleCreate}
        onCancel={() => router.back()}
        isLoading={createMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
});
