/**
 * Tenant Invoices List Screen
 * Lists all invoices with filtering options
 */

import React, { useState, useCallback } from 'react';
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
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useInvoicesListQuery } from '../../data/repositories/billing.repository.impl';
import { InvoiceListItem } from '../components/InvoiceListItem';
import { InvoiceResponse, ListInvoicesParams } from '../../data/models/billing.dtos';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

export const TenantInvoicesListScreen: React.FC = () => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // Filter state
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Build query params
  const queryParams: ListInvoicesParams = {
    limit: 50,
  };

  // Fetch invoices
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInvoicesListQuery(tenantId, queryParams);

  const allInvoices = data?.items || [];

  // Client-side filtering by status
  const displayedInvoices = selectedStatus === 'all'
    ? allInvoices
    : allInvoices.filter((inv) => inv.status.toLowerCase() === selectedStatus);

  const handleInvoicePress = useCallback(
    (invoice: InvoiceResponse) => {
      router.push(`/clinic-admin/billing/invoices/${invoice.id}`);
    },
    [router]
  );

  const handleCreateInvoice = () => {
    router.push('/clinic-admin/billing/invoices/create');
  };

  const renderItem = useCallback(
    ({ item }: { item: InvoiceResponse }) => (
      <InvoiceListItem invoice={item} onPress={() => handleInvoicePress(item)} />
    ),
    [handleInvoicePress]
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Status Filters */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS}
        keyExtractor={(item) => item.value}
        contentContainerStyle={styles.filtersContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedStatus === item.value && styles.filterChipActive,
            ]}
            onPress={() => setSelectedStatus(item.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedStatus === item.value && styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {displayedInvoices.length} invoice{displayedInvoices.length !== 1 ? 's' : ''}
          {!!(data?.total && data.total > displayedInvoices.length) && ` of ${data.total}`}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary.main} />
      ) : isError ? (
        <>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
          <Text style={styles.emptyTitle}>Unable to Load Invoices</Text>
          <Text style={styles.emptySubtitle}>
            {error?.message || 'Please check your connection and try again.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Ionicons name="document-text-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>
            {selectedStatus !== 'all' ? 'No invoices found' : 'No Invoices Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {selectedStatus !== 'all'
              ? 'Try changing the status filter'
              : 'Create your first invoice to get started'}
          </Text>
          {selectedStatus === 'all' && (
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateInvoice}>
              <Ionicons name="add" size={20} color={colors.text.light} />
              <Text style={styles.emptyButtonText}>Create Invoice</Text>
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
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Invoices</Text>
          <Text style={styles.headerSubtitle}>Manage your invoices</Text>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={displayedInvoices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateInvoice}>
        <Ionicons name="add" size={28} color={colors.text.light} />
      </TouchableOpacity>
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
    ...typography.h5,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  headerContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  filtersContainer: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.grey[100],
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary.main,
  },
  filterChipText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.text.light,
  },
  resultsRow: {
    marginBottom: spacing.sm,
  },
  resultsText: {
    ...typography.body2,
    color: colors.text.secondary,
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
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
