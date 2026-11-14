/**
 * Inventory Item Detail Screen
 * Displays detailed information about an inventory item
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
  RefreshControl,
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
  useDeleteInventoryItemMutation,
  useInventoryMovementsListQuery,
} from '../../data/repositories/inventory.repository.impl';
import { MovementListItem } from '../components/MovementListItem';
import {
  formatStock,
  formatCurrency,
  formatDate,
  getMedicineTypeLabel,
  getCategoryLabel,
  getDoshaLabels,
  isLowStock,
  isCriticalStock,
  parseStock,
  formatLocation,
} from '../../data/models/inventory.dtos';

export const InventoryItemDetailScreen: React.FC = () => {
  const router = useRouter();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  const [showMovements, setShowMovements] = useState(false);

  // Fetch item details
  const {
    data: item,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInventoryItemDetailQuery(tenantId, itemId || '');

  // Fetch movements
  const {
    data: movementsData,
    isLoading: movementsLoading,
  } = useInventoryMovementsListQuery(tenantId, itemId || '', { limit: 10 });

  // Delete mutation
  const deleteMutation = useDeleteInventoryItemMutation(tenantId, itemId || '');

  const movements = movementsData?.items || [];

  const handleEdit = () => {
    router.push(`/clinic-admin/inventory/${itemId}/edit`);
  };

  const handleAdjustStock = () => {
    router.push(`/clinic-admin/inventory/adjust?itemId=${itemId}`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync();
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete item. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading item details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !item) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Item Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
          <Text style={styles.errorTitle}>Unable to Load Item</Text>
          <Text style={styles.errorSubtitle}>
            {error?.message || 'Please check your connection and try again.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const lowStock = isLowStock(item);
  const criticalStock = isCriticalStock(item);
  const stockColor = criticalStock
    ? colors.error.main
    : lowStock
    ? colors.warning.main
    : colors.success.main;
  const doshaLabels = getDoshaLabels(item.dosha_properties);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary.main]}
          />
        }
      >
        {/* Stock Status Card */}
        <View style={[styles.stockCard, { borderColor: stockColor }]}>
          <View style={styles.stockCardHeader}>
            <View style={[styles.stockIndicator, { backgroundColor: stockColor }]} />
            <Text style={[styles.stockStatus, { color: stockColor }]}>
              {criticalStock ? 'Critical Stock' : lowStock ? 'Low Stock' : 'In Stock'}
            </Text>
          </View>
          <Text style={styles.stockValue}>
            {formatStock(item.current_stock, item.unit)}
          </Text>
          <Text style={styles.stockReorder}>
            Reorder at: {item.reorder_point} {item.unit || 'units'}
          </Text>
          <TouchableOpacity
            style={[styles.adjustButton, { backgroundColor: stockColor }]}
            onPress={handleAdjustStock}
          >
            <Ionicons name="swap-horizontal" size={20} color={colors.text.light} />
            <Text style={styles.adjustButtonText}>Adjust Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {getCategoryLabel(item.category)}
              </Text>
            </View>
          </View>

          {item.medicine_type && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Medicine Type</Text>
              <View style={[styles.categoryBadge, { backgroundColor: colors.secondary.main + '15' }]}>
                <Text style={[styles.categoryText, { color: colors.secondary.main }]}>
                  {getMedicineTypeLabel(item.medicine_type)}
                </Text>
              </View>
            </View>
          )}

          {!!item.brand && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Brand</Text>
              <Text style={styles.infoValue}>{item.brand}</Text>
            </View>
          )}

          {!!item.manufacturer && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Manufacturer</Text>
              <Text style={styles.infoValue}>{item.manufacturer}</Text>
            </View>
          )}

          {!!item.strength && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Strength</Text>
              <Text style={styles.infoValue}>{item.strength}</Text>
            </View>
          )}

          {!!item.composition && (
            <View style={styles.infoRowVertical}>
              <Text style={styles.infoLabel}>Composition</Text>
              <Text style={styles.infoValueMultiline}>{item.composition}</Text>
            </View>
          )}

          {/* Dosha badges */}
          {doshaLabels.length > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dosha Relevance</Text>
              <View style={styles.doshaContainer}>
                {doshaLabels.map((dosha) => (
                  <View key={dosha} style={styles.doshaBadge}>
                    <Text style={styles.doshaText}>{dosha}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Pricing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>

          <View style={styles.priceGrid}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>MRP</Text>
              <Text style={styles.priceValue}>{formatCurrency(item.mrp)}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Buy Price</Text>
              <Text style={styles.priceValue}>{formatCurrency(item.buy_price)}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>GST</Text>
              <Text style={styles.priceValue}>
                {item.gst_percentage !== null ? `${item.gst_percentage}%` : '—'}
              </Text>
            </View>
            {!!item.hsn_code && (
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>HSN Code</Text>
                <Text style={styles.priceValue}>{item.hsn_code}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Additional Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details</Text>

          {!!item.location && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{formatLocation(item.location)}</Text>
            </View>
          )}

          {!!item.barcode && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Barcode</Text>
              <Text style={styles.infoValue}>{item.barcode}</Text>
            </View>
          )}

          {!!item.sku && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SKU</Text>
              <Text style={styles.infoValue}>{item.sku}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Batch Tracking</Text>
            <Text style={styles.infoValue}>
              {item.batch_tracking_enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>

          {item.batch_tracking_enabled && (
            <TouchableOpacity
              style={styles.batchesLink}
              onPress={() => router.push(`/clinic-admin/inventory/batches?itemId=${itemId}`)}
            >
              <Ionicons name="layers-outline" size={20} color={colors.primary.main} />
              <Text style={styles.batchesLinkText}>View Batches</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.primary.main} />
            </TouchableOpacity>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Prescription Required</Text>
            <Text style={styles.infoValue}>
              {item.requires_prescription ? 'Yes' : 'No'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>{formatDate(item.created_at)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>{formatDate(item.updated_at)}</Text>
          </View>
        </View>

        {/* Recent Movements */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowMovements(!showMovements)}
          >
            <Text style={styles.sectionTitle}>Recent Movements</Text>
            <Ionicons
              name={showMovements ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.text.secondary}
            />
          </TouchableOpacity>

          {showMovements && (
            <View style={styles.movementsList}>
              {movementsLoading ? (
                <ActivityIndicator size="small" color={colors.primary.main} />
              ) : movements.length > 0 ? (
                movements.map((movement) => (
                  <MovementListItem key={movement.id} movement={movement} />
                ))
              ) : (
                <Text style={styles.noMovementsText}>No movements recorded yet</Text>
              )}
            </View>
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.error.main} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={colors.error.main} />
              <Text style={styles.deleteButtonText}>Delete Item</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: {
    flex: 1,
    ...typography.h6,
    color: colors.text.primary,
  },
  editButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
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
    padding: spacing.lg,
  },
  errorTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
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
  stockCard: {
    backgroundColor: colors.background.default,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  stockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  stockStatus: {
    ...typography.body2,
    fontWeight: '700',
  },
  stockValue: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
  },
  stockReorder: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginTop: spacing.md,
  },
  adjustButtonText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.light,
  },
  section: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoRowVertical: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoLabel: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  infoValue: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.primary,
  },
  infoValueMultiline: {
    ...typography.body2,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primary.main + '15',
  },
  categoryText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary.main,
  },
  doshaContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  doshaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.secondary.main + '15',
  },
  doshaText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.secondary.main,
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  priceItem: {
    width: '45%',
    backgroundColor: colors.grey[50],
    borderRadius: 8,
    padding: spacing.md,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  priceValue: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: 2,
  },
  movementsList: {
    marginTop: spacing.md,
  },
  noMovementsText: {
    ...typography.body2,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.error.main + '10',
    borderWidth: 1,
    borderColor: colors.error.main + '30',
    marginTop: spacing.md,
  },
  deleteButtonText: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.error.main,
  },
  batchesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary.main + '10',
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  batchesLinkText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.primary.main,
    flex: 1,
    marginLeft: spacing.sm,
  },
});
