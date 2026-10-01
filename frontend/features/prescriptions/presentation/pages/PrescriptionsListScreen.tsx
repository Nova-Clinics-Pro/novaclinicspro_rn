/**
 * Prescriptions List Screen
 * Displays list of prescriptions (tenant-scoped, can filter by client)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  usePrescriptionsListQuery,
} from '../../data/repositories/prescriptions.repository.impl';
import {
  PrescriptionResponse,
  PrescriptionStatus,
} from '../../data/models/prescriptions.dtos';
import { PrescriptionListItem } from '../components/PrescriptionListItem';
import { EmptyPrescriptionsState } from '../components/EmptyPrescriptionsState';

interface PrescriptionsListScreenProps {
  clientId?: string;
  clientName?: string;
}

export const PrescriptionsListScreen: React.FC<PrescriptionsListScreenProps> = ({
  clientId: propClientId,
  clientName: propClientName,
}) => {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId: string; clientName?: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const clientId = propClientId || params.clientId;
  const clientName = propClientName || params.clientName;

  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | undefined>(undefined);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = usePrescriptionsListQuery(tenantId, {
    client_id: clientId,
    status: statusFilter,
  });

  const handlePrescriptionPress = useCallback((prescription: PrescriptionResponse) => {
    if (clientId) {
      router.push({
        pathname: '/clinic-admin/clients/[clientId]/prescriptions/[prescriptionId]' as any,
        params: { clientId, prescriptionId: prescription.id },
      });
    } else {
      router.push({
        pathname: '/clinic-admin/prescriptions/[prescriptionId]' as any,
        params: { prescriptionId: prescription.id },
      });
    }
  }, [router, clientId]);

  const handleCreatePress = useCallback(() => {
    if (clientId) {
      router.push({
        pathname: '/clinic-admin/clients/[clientId]/prescriptions/new' as any,
        params: { clientId },
      });
    } else {
      router.push('/clinic-admin/prescriptions/new' as any);
    }
  }, [router, clientId]);

  const renderItem = useCallback(({ item }: { item: PrescriptionResponse }) => (
    <PrescriptionListItem
      prescription={item}
      onPress={() => handlePrescriptionPress(item)}
    />
  ), [handlePrescriptionPress]);

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
        <Text style={styles.headerTitle}>Prescriptions</Text>
        {clientName && (
          <Text style={styles.headerSubtitle}>{clientName}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleCreatePress}
        accessibilityRole="button"
        accessibilityLabel="Create new prescription"
      >
        <Ionicons name="add" size={24} color={colors.background.default} />
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterChip,
          !statusFilter && styles.filterChipActive,
        ]}
        onPress={() => setStatusFilter(undefined)}
      >
        <Text style={[styles.filterChipText, !statusFilter && styles.filterChipTextActive]}>
          All
        </Text>
      </TouchableOpacity>
      {(['DRAFT', 'FINAL', 'SIGNED'] as PrescriptionStatus[]).map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.filterChip,
            statusFilter === status && styles.filterChipActive,
          ]}
          onPress={() => setStatusFilter(status)}
        >
          <Text
            style={[
              styles.filterChipText,
              statusFilter === status && styles.filterChipTextActive,
            ]}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading prescriptions...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <EmptyPrescriptionsState
          variant="error"
          title="Unable to Load Prescriptions"
          message={
            error?.message?.includes('401')
              ? 'Authentication failed. Please try logging in again.'
              : 'Could not load prescriptions. Pull down to retry.'
          }
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      );
    }

    const prescriptions = data?.items || [];

    if (prescriptions.length === 0) {
      return (
        <EmptyPrescriptionsState
          title={statusFilter ? `No ${statusFilter.toLowerCase()} prescriptions` : 'No Prescriptions'}
          message={
            clientId
              ? 'No prescriptions have been created for this patient yet.'
              : 'No prescriptions found.'
          }
          actionLabel="Create Prescription"
          onActionPress={handleCreatePress}
        />
      );
    }

    return (
      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      {renderFilters()}
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.grey[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary.main,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.background.default,
  },
  content: {
    flex: 1,
  },
  listContent: {
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
});

export default PrescriptionsListScreen;
