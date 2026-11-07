/**
 * Inventory Batches Screen
 * Displays and manages batches for an inventory item
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  useInventoryItemDetailQuery,
  useInventoryBatchesListQuery,
  useCreateInventoryBatchMutation,
  useUpdateInventoryBatchMutation,
} from '../../data/repositories/inventory.repository.impl';
import { BatchListItem } from '../components/BatchListItem';
import { BatchForm } from '../components/BatchForm';
import {
  BatchResponse,
  BatchCreateRequest,
  BatchUpdateRequest,
  isExpired,
  isExpiringSoon,
} from '../../data/models/inventory.dtos';

export const InventoryBatchesScreen: React.FC = () => {
  const router = useRouter();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchResponse | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Fetch item details
  const { data: item, isLoading: itemLoading } = useInventoryItemDetailQuery(
    tenantId,
    itemId || ''
  );

  // Fetch batches
  const {
    data: batchesData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInventoryBatchesListQuery(tenantId, itemId || '', {
    is_active: showInactive ? undefined : true,
    limit: 50,
  });

  // Mutations
  const createMutation = useCreateInventoryBatchMutation(tenantId, itemId || '');
  const updateMutation = useUpdateInventoryBatchMutation(
    tenantId,
    editingBatch?.id || '',
    itemId || ''
  );

  const batches = batchesData?.items || [];

  // Stats
  const expiredCount = batches.filter((b) => isExpired(b.expiry_date)).length;
  const expiringSoonCount = batches.filter((b) => isExpiringSoon(b.expiry_date)).length;
  const validCount = batches.length - expiredCount - expiringSoonCount;

  const handleCreateBatch = async (data: BatchCreateRequest) => {
    try {
      await createMutation.mutateAsync(data);
      setShowCreateModal(false);
      Alert.alert('Success', 'Batch created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create batch.');
    }
  };

  const handleUpdateBatch = async (data: BatchUpdateRequest) => {
    try {
      await updateMutation.mutateAsync(data);
      setEditingBatch(null);
      Alert.alert('Success', 'Batch updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update batch.');
    }
  };

  const renderBatch = useCallback(
    ({ item: batch }: { item: BatchResponse }) => (
      <BatchListItem
        batch={batch}
        onEdit={() => setEditingBatch(batch)}
      />
    ),
    []
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.success.main + '15' }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success.main} />
          <Text style={[styles.statCount, { color: colors.success.main }]}>{validCount}</Text>
          <Text style={styles.statLabel}>Valid</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warning.main + '15' }]}>
          <Ionicons name="time" size={20} color={colors.warning.main} />
          <Text style={[styles.statCount, { color: colors.warning.main }]}>{expiringSoonCount}</Text>
          <Text style={styles.statLabel}>Expiring</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.error.main + '15' }]}>
          <Ionicons name="alert-circle" size={20} color={colors.error.main} />
          <Text style={[styles.statCount, { color: colors.error.main }]}>{expiredCount}</Text>
          <Text style={styles.statLabel}>Expired</Text>
        </View>
      </View>

      {/* Filters */}
      <TouchableOpacity
        style={[
          styles.filterToggle,
          showInactive && styles.filterToggleActive,
        ]}
        onPress={() => setShowInactive(!showInactive)}
      >
        <Ionicons
          name={showInactive ? 'eye' : 'eye-off'}
          size={16}
          color={showInactive ? colors.text.light : colors.text.secondary}
        />
        <Text
          style={[
            styles.filterToggleText,
            showInactive && styles.filterToggleTextActive,
          ]}
        >
          {showInactive ? 'Showing All' : 'Hide Inactive'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.resultsText}>
        {batches.length} batch{batches.length !== 1 ? 'es' : ''}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary.main} />
      ) : isError ? (
        <>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
          <Text style={styles.emptyTitle}>Unable to Load Batches</Text>
          <Text style={styles.emptySubtitle}>
            {error?.message || 'Please check your connection.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Ionicons name="layers-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No Batches Yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first batch to track expiry dates
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color={colors.text.light} />
            <Text style={styles.emptyButtonText}>Add Batch</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Batches</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {itemLoading ? 'Loading...' : item?.name || 'Inventory Item'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={batches}
        keyExtractor={(item) => item.id}
        renderItem={renderBatch}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary.main]}
          />
        }
      />

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Batch</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <BatchForm
              onSubmit={(data) => handleCreateBatch(data as BatchCreateRequest)}
              isLoading={createMutation.isPending}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={!!editingBatch}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingBatch(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditingBatch(null)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Batch</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {editingBatch && (
              <BatchForm
                initialData={editingBatch}
                onSubmit={handleUpdateBatch}
                isLoading={updateMutation.isPending}
                isEdit
              />
            )}
          </ScrollView>
        </SafeAreaView>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.default,
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
    ...typography.h6,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  addButton: {
    padding: spacing.xs,
  },
  headerContainer: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 12,
  },
  statCount: {
    ...typography.h5,
    fontWeight: '700',
    marginTop: 2,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.grey[100],
    marginBottom: spacing.md,
  },
  filterToggleActive: {
    backgroundColor: colors.info.main,
  },
  filterToggleText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterToggleTextActive: {
    color: colors.text.light,
  },
  resultsText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.light,
  },
  retryButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.light,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
});
