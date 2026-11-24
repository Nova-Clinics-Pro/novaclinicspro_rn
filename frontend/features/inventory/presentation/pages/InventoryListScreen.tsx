/**
 * Inventory List Screen
 * Main screen for viewing and managing inventory items
 */

import { t } from '../../../../core/localization';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useDebounce } from '../../../../core/hooks/useDebounce';
import { 
  useInventoryItemsListQuery,
  useSearchInventoryQuery,
} from '../../data/repositories/inventory.repository.impl';
import { InventoryItemListItem } from '../components/InventoryItemListItem';
import {
  InventoryItemResponse,
  InventoryCategory,
  ListInventoryParams,
} from '../../data/models/inventory.dtos';
import { ApiErrorState } from '../../../../core/components/ui/ApiErrorState';

// Minimum characters before triggering search
const MIN_SEARCH_LENGTH = 3;
// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 300;

const CATEGORIES: { value: InventoryCategory | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'clinicAdmin.common.all' },
  { value: 'medicine', labelKey: 'clinicAdmin.inventoryList.categoryMedicine' },
  { value: 'supplement', labelKey: 'clinicAdmin.inventoryList.categorySupplement' },
  { value: 'equipment', labelKey: 'clinicAdmin.inventoryList.categoryEquipment' },
  { value: 'consumable', labelKey: 'clinicAdmin.inventoryList.categoryConsumable' },
];

export const InventoryListScreen: React.FC = () => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'all'>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Debounce search query - only trigger API call after user stops typing
  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);
  
  // Only use search query if >= 3 characters
  const effectiveSearchQuery = debouncedSearchQuery.length >= MIN_SEARCH_LENGTH 
    ? debouncedSearchQuery 
    : '';

  // Build query params for list API (when not searching)
  const queryParams: ListInventoryParams = {
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    limit: 50,
  };

  // Fetch inventory items (regular list)
  const listQuery = useInventoryItemsListQuery(
    tenantId, 
    queryParams,
    { enabled: !!tenantId && effectiveSearchQuery === '' }
  );
  
  // Fetch search results (when searching)
  const searchQuery_ = useSearchInventoryQuery(
    tenantId,
    effectiveSearchQuery,
    50,
    { enabled: !!tenantId && effectiveSearchQuery.length >= MIN_SEARCH_LENGTH }
  );

  // Determine which data source to use
  const data = effectiveSearchQuery ? searchQuery_.data : listQuery.data;
  const isLoading = effectiveSearchQuery ? searchQuery_.isLoading : listQuery.isLoading;
  const isRefetching = effectiveSearchQuery ? searchQuery_.isRefetching : listQuery.isRefetching;
  const refetch = effectiveSearchQuery ? searchQuery_.refetch : listQuery.refetch;
  const isError = effectiveSearchQuery ? searchQuery_.isError : listQuery.isError;
  const error = effectiveSearchQuery ? searchQuery_.error : listQuery.error;

  // Client-side filtering for partial search (< 3 chars) and low stock
  const displayedItems = useMemo(() => {
    let items = data?.items || [];
    
    // If search query is 1-2 characters, filter client-side
    if (searchQuery.length > 0 && searchQuery.length < MIN_SEARCH_LENGTH) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.barcode?.toLowerCase().includes(query)
      );
    }
    
    // Filter low stock items if needed
    if (showLowStockOnly) {
      items = items.filter((item) => {
        const stock = parseFloat(item.current_stock) || 0;
        return stock <= item.reorder_point;
      });
    }
    
    return items;
  }, [data?.items, searchQuery, showLowStockOnly]);

  const handleItemPress = useCallback(
    (item: InventoryItemResponse) => {
      router.push(`/clinic-admin/inventory/${item.id}`);
    },
    [router]
  );

  const handleCreateItem = () => {
    router.push('/clinic-admin/inventory/create');
  };

  const renderItem = useCallback(
    ({ item }: { item: InventoryItemResponse }) => (
      <InventoryItemListItem item={item} onPress={() => handleItemPress(item)} />
    ),
    [handleItemPress]
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('clinicAdmin.inventoryList.searchPlaceholder', { min: MIN_SEARCH_LENGTH })}
          placeholderTextColor={theme.colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(item) => item.value}
        contentContainerStyle={styles.categoriesContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item.value && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(item.value)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === item.value && styles.categoryChipTextActive,
              ]}
            >
              {t(item.labelKey)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Low Stock Filter Toggle */}
      <TouchableOpacity
        style={[
          styles.lowStockToggle,
          showLowStockOnly && styles.lowStockToggleActive,
        ]}
        onPress={() => setShowLowStockOnly(!showLowStockOnly)}
      >
        <Ionicons
          name="warning"
          size={16}
          color={showLowStockOnly ? theme.colors.text.onPrimary : theme.colors.feedback.warning}
        />
        <Text
          style={[
            styles.lowStockToggleText,
            showLowStockOnly && styles.lowStockToggleTextActive,
          ]}
        >
          {t('clinicAdmin.inventoryList.lowStockOnly')}
        </Text>
      </TouchableOpacity>

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {data?.total && data.total > displayedItems.length
            ? t('clinicAdmin.inventoryList.itemCountOf', { shown: displayedItems.length, total: data.total })
            : t(
                displayedItems.length === 1
                  ? 'clinicAdmin.inventoryList.itemCountOne'
                  : 'clinicAdmin.inventoryList.itemCountMany',
                { count: displayedItems.length }
              )}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary.default} />
      ) : isError ? (
        <ApiErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <Ionicons name="cube-outline" size={48} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyTitle}>
            {searchQuery || selectedCategory !== 'all'
              ? t('clinicAdmin.inventoryList.emptyFiltered')
              : t('clinicAdmin.inventoryList.emptyNone')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery || selectedCategory !== 'all'
              ? t('clinicAdmin.inventoryList.emptyFilteredHint')
              : t('clinicAdmin.inventoryList.emptyNoneHint')}
          </Text>
          {!searchQuery && selectedCategory === 'all' && (
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateItem}>
              <Ionicons name="add" size={20} color={theme.colors.text.onPrimary} />
              <Text style={styles.emptyButtonText}>{t('clinicAdmin.inventoryList.addItem')}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('clinicAdmin.inventoryList.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('clinicAdmin.inventoryList.subtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.alertsButton}
          onPress={() => router.push('/clinic-admin/inventory/alerts')}
        >
          <Ionicons name="notifications" size={24} color={theme.colors.feedback.warning} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={displayedItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary.default]}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateItem}>
        <Ionicons name="add" size={28} color={theme.colors.text.onPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const makeStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
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
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: theme.colors.text.secondary,
  },
  alertsButton: {
    padding: spacing.xs,
  },
  headerContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    minHeight: theme.sizes.touchTarget,
    marginLeft: spacing.sm,
    ...typography.body1,
    color: theme.colors.text.primary,
  },
  categoriesContainer: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.background.muted,
    marginRight: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary.default,
  },
  categoryChipText: {
    ...typography.body2,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  categoryChipTextActive: {
    color: theme.colors.text.onPrimary,
  },
  lowStockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.feedback.warning + '15',
    marginBottom: spacing.md,
  },
  lowStockToggleActive: {
    backgroundColor: theme.colors.feedback.warning,
  },
  lowStockToggleText: {
    ...typography.body2,
    fontWeight: '600',
    color: theme.colors.feedback.warning,
  },
  lowStockToggleTextActive: {
    color: theme.colors.text.onPrimary,
  },
  resultsRow: {
    marginBottom: spacing.sm,
  },
  resultsText: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h6,
    color: theme.colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body2,
    color: theme.colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.colors.primary.default,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    ...typography.body1,
    fontWeight: '600',
    color: theme.colors.text.onPrimary,
  },
  retryButton: {
    backgroundColor: theme.colors.primary.default,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    ...typography.body1,
    fontWeight: '600',
    color: theme.colors.text.onPrimary,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary.default,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
