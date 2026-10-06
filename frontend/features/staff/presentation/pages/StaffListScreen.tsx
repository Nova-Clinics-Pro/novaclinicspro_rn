/**
 * Staff List Screen
 * Displays list of all staff members for the clinic
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useDebounce } from '../../../../core/hooks/useDebounce';
import { t, ErrorTokens } from '../../../../core/localization';
import {
  useStaffListQuery,
  useCreateStaffMutation,
  useDeleteStaffMutation,
  useSearchStaffQuery,
} from '../../data/repositories/staff.repository.impl';
import {
  StaffResponse,
  StaffCreate,
  StaffType,
  getStaffTypeLabel,
} from '../../data/models/staff.dtos';
import { StaffListItem } from '../components/StaffListItem';
import { StaffForm } from '../components/StaffForm';

const STAFF_TYPE_FILTERS: (StaffType | 'all')[] = [
  'all',
  'doctor',
  'therapist',
  'nurse',
  'receptionist',
  'pharmacist',
  'admin',
];

const STATUS_FILTERS = ['active', 'inactive'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

// Minimum characters before triggering search
const MIN_SEARCH_LENGTH = 3;
// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 300;

export const StaffListScreen: React.FC = () => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<StaffType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('active');
  const [showAddModal, setShowAddModal] = useState(false);

  // Debounce search query - only trigger API call after user stops typing
  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);
  
  // Only use search query if >= 3 characters, otherwise don't filter
  const effectiveSearchQuery = debouncedSearchQuery.length >= MIN_SEARCH_LENGTH 
    ? debouncedSearchQuery 
    : '';

  // Build query params based on filters (for list API when not searching)
  const queryParams = useMemo(() => ({
    staff_type: selectedType === 'all' ? undefined : selectedType,
    is_active: selectedStatus === 'active',
    limit: 100, // Load more to enable client-side filtering
  }), [selectedType, selectedStatus]);

  // Use list API when not searching
  const listQuery = useStaffListQuery(
    tenantId, 
    queryParams,
    { enabled: !!tenantId && effectiveSearchQuery === '' }
  );
  
  // Use search API when searching (>= 3 chars)
  const searchResultsQuery = useSearchStaffQuery(
    tenantId,
    effectiveSearchQuery,
    100,
    { enabled: !!tenantId && effectiveSearchQuery.length >= MIN_SEARCH_LENGTH }
  );

  // Combine data sources
  const staffData = effectiveSearchQuery ? searchResultsQuery.data : listQuery.data;
  const isLoading = effectiveSearchQuery ? searchResultsQuery.isLoading : listQuery.isLoading;
  const isError = effectiveSearchQuery ? searchResultsQuery.isError : listQuery.isError;
  const error = effectiveSearchQuery ? searchResultsQuery.error : listQuery.error;
  const isRefetching = effectiveSearchQuery ? searchResultsQuery.isRefetching : listQuery.isRefetching;
  const refetch = effectiveSearchQuery ? searchResultsQuery.refetch : listQuery.refetch;

  // Client-side filtering for partial search (< 3 chars) and type/status filters
  const filteredStaff = useMemo(() => {
    let staff = staffData?.items || [];
    
    // If search query is 1-2 characters, filter client-side
    if (searchQuery.length > 0 && searchQuery.length < MIN_SEARCH_LENGTH) {
      const lowerQuery = searchQuery.toLowerCase();
      staff = staff.filter(s => 
        s.full_name.toLowerCase().includes(lowerQuery) ||
        s.email?.toLowerCase().includes(lowerQuery) ||
        (s.phone && s.phone.includes(searchQuery))
      );
    }
    
    // Apply type filter (when using search API, filters aren't applied server-side)
    if (effectiveSearchQuery && selectedType !== 'all') {
      staff = staff.filter(s => s.staff_type === selectedType);
    }
    
    // Apply status filter (when using search API)
    if (effectiveSearchQuery) {
      staff = staff.filter(s =>
        selectedStatus === 'active' ? s.is_active : !s.is_active
      );
    }
    
    return staff;
  }, [staffData?.items, searchQuery, selectedType, selectedStatus, effectiveSearchQuery]);

  // Mutations
  const createMutation = useCreateStaffMutation(tenantId);
  const deleteMutation = useDeleteStaffMutation(tenantId);

  const handleStaffPress = useCallback(
    (staff: StaffResponse) => {
      router.push(`/clinic-admin/staff/${staff.id}`);
    },
    [router]
  );

  const handleCreateStaff = useCallback(
    async (data: StaffCreate) => {
      try {
        await createMutation.mutateAsync(data);
        setShowAddModal(false);
        Alert.alert(t('common.success'), t('success.created'));
      } catch (err: any) {
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          t(ErrorTokens.staff.createFailed);
        Alert.alert(t('common.error'), message);
      }
    },
    [createMutation]
  );

  const handleDeleteStaff = useCallback(
    async (staffId: string) => {
      Alert.alert(
        'Delete Staff',
        'Are you sure you want to delete this staff member?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteMutation.mutateAsync(staffId);
                Alert.alert('Success', 'Staff member deleted');
              } catch (err: any) {
                const message =
                  err?.response?.data?.error ||
                  err?.response?.data?.message ||
                  err?.response?.data?.detail ||
                  err?.message ||
                  'Failed to delete staff';
                Alert.alert('Error', message);
              }
            },
          },
        ]
      );
    },
    [deleteMutation]
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search staff... (min ${MIN_SEARCH_LENGTH} chars)`}
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {STATUS_FILTERS.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  selectedStatus === status && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedStatus === status && styles.filterChipTextSelected,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Type Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Staff Type</Text>
        <FlatList
          horizontal
          data={STAFF_TYPE_FILTERS}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedType === item && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedType(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedType === item && styles.filterChipTextSelected,
                ]}
              >
                {item === 'all' ? 'All' : getStaffTypeLabel(item as StaffType)}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
        />
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Staff Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Try adjusting your search or filters'
          : 'Add your first staff member to get started'}
      </Text>

    </View>
  );

  // Error state
  if (isError && !staffData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error.main} />
          <Text style={styles.errorTitle}>Could not load staff</Text>
          <Text style={styles.errorText}>
            {error?.message || 'Please check your connection and try again'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>Staff Directory</Text>
          <Text style={styles.pageSubtitle}>
            {staffData?.total || 0} staff members
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color={colors.background.default} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStaff}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyList}
          renderItem={({ item }) => (
            <StaffListItem staff={item} onPress={handleStaffPress} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary.main]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Staff Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Staff</Text>
            <View style={{ width: 24 }} />
          </View>
          <StaffForm
            onSubmit={(data) => handleCreateStaff(data as StaffCreate)}
            onCancel={() => setShowAddModal(false)}
            isLoading={createMutation.isPending}
          />
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
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  backButton: {
    padding: spacing.xs,
  },
  titleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pageTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  pageSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  addButton: {
    backgroundColor: colors.primary.main,
    padding: spacing.sm,
    borderRadius: 8,
  },
  header: {
    paddingBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
    ...typography.body1,
    color: colors.text.primary,
  },
  filterSection: {
    marginBottom: spacing.sm,
  },
  filterLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterList: {
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterChipSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterChipText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  filterChipTextSelected: {
    color: colors.background.default,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  emptyButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.background.default,
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
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  modalTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
});

export default StaffListScreen;
