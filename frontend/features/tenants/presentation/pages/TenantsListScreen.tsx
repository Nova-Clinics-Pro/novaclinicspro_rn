/**
 * Tenants List Screen
 * Main screen for Super Admin to view and manage all tenants
 */

import React, { useState } from 'react';
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
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useTenantsListQuery } from '../../data/repositories/tenants.repository.impl';
import { OrgTenantResponse } from '../../data/models/tenants.dtos';
import { useOrganizationTenantScope } from '../hooks/useOrganizationTenantScope';

export default function TenantsListScreen() {
  const theme = useClinicTheme();
  const router = useRouter();
  const { logout, currentUser } = useAuth();
  const { organizationId } = useOrganizationTenantScope();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  // Fetch tenants with React Query
  const {
    data: tenants,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTenantsListQuery(organizationId, {
    search: searchQuery || undefined,
    status: selectedStatus,
  });

  const handleLogout = () => {
    // Logout logic handled by parent
    router.back();
  };

  const renderTenantItem = ({ item }: { item: OrgTenantResponse }) => (
    <TouchableOpacity
      style={[
        styles.tenantCard,
        {
          backgroundColor: theme.colors.surface.default,
          borderColor: theme.colors.border.default,
        },
      ]}
      onPress={() => router.push(`/super-admin/tenants/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.tenantHeader}>
        <View style={styles.tenantInfo}>
          <Text style={[styles.tenantName, { color: theme.colors.text.primary }]}>
            {item.name}
          </Text>
          <Text style={[styles.tenantCode, { color: theme.colors.text.secondary }]}>
            {item.code} • {item.clinic_type}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'active'
                  ? theme.colors.feedback.successLight
                  : item.status === 'suspended'
                  ? theme.colors.feedback.errorLight
                  : theme.colors.feedback.warningLight,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === 'active'
                    ? theme.colors.feedback.success
                    : item.status === 'suspended'
                    ? theme.colors.feedback.error
                    : theme.colors.feedback.warning,
              },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.tenantDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={14} color={theme.colors.text.secondary} />
          <Text style={[styles.detailText, { color: theme.colors.text.secondary }]}>
            {item.email || 'No email'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={14} color={theme.colors.text.secondary} />
          <Text style={[styles.detailText, { color: theme.colors.text.secondary }]}>
            {item.subscription_plan} • {item.subscription_status}
          </Text>
        </View>
        {item.trial_end_date && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color={theme.colors.feedback.warning} />
            <Text style={[styles.detailText, { color: theme.colors.feedback.warning }]}>
              Trial ends: {new Date(item.trial_end_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tenantFooter}>
        <Text style={[styles.createdText, { color: theme.colors.text.tertiary }]}>
          Created {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="business-outline" size={64} color={theme.colors.text.tertiary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
        No Tenants Found
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
        {searchQuery ? 'Try adjusting your search' : 'Create your first tenant to get started'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle" size={64} color={theme.colors.feedback.error} />
      <Text style={[styles.errorTitle, { color: theme.colors.text.primary }]}>
        Unable to Load Tenants
      </Text>
      <Text style={[styles.errorSubtitle, { color: theme.colors.text.secondary }]}>
        {error?.message || 'An error occurred. Please try again.'}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: theme.colors.primary.default }]}
        onPress={() => refetch()}
      >
        <Text style={[styles.retryButtonText, { color: theme.colors.primary.onPrimary }]}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      edges={['top']}
    >
      {/* Navigation Header */}
      <View style={[styles.navHeader, { backgroundColor: theme.colors.surface.default }]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.colors.text.primary }]}>
          Tenants Management
        </Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/super-admin')}
        >
          <Ionicons name="home-outline" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface.default }]}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.colors.background.default,
              borderColor: theme.colors.border.default,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={theme.colors.text.secondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text.primary }]}
            placeholder="Search by name or email..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary.default }]}
          onPress={() => router.push('/super-admin/tenants/create')}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary.onPrimary} />
          <Text style={[styles.createButtonText, { color: theme.colors.primary.onPrimary }]}>
            Create Tenant
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tenants List */}
      {isLoading && !isFetching ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary.default} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading tenants...
          </Text>
        </View>
      ) : isError ? (
        renderError()
      ) : (
        <FlatList
          data={tenants || []}
          renderItem={renderTenantItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary.default}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  navButton: {
    padding: spacing.sm,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
    flexGrow: 1,
  },
  tenantCard: {
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  tenantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  tenantCode: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tenantDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: 14,
  },
  tenantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  createdText: {
    fontSize: 12,
  },
});
