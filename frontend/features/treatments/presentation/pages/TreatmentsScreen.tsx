/**
 * Treatments Screen
 * List and manage Ayurvedic treatments/services
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { useDebounce } from '../../../../core/hooks/useDebounce';
import {
  useTreatmentsListQuery,
  useDeleteTreatmentMutation,
  useSearchTreatmentsQuery,
} from '../../data/repositories/treatments.repository.impl';
import { useCurrentTenantQuery } from '../../../tenants/data/repositories/tenants.repository.impl';
import { useFeatures, isAyurvedaClinic as checkIsAyurveda } from '../../../../core/hooks/useFeatures';
import {
  TreatmentResponse,
  formatPrice,
  formatDuration,
  getDoshaSummary,
  DOSHA_COLORS,
} from '../../data/models/treatments.dtos';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import { MultiDayAppointmentsSetting } from '../../../capabilities/presentation/components/MultiDayAppointmentsSetting';

// Minimum characters before triggering search
const MIN_SEARCH_LENGTH = 3;
// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 300;

// Treatment card component
const TreatmentCard: React.FC<{
  treatment: TreatmentResponse;
  onPress: () => void;
  isAyurvedaClinic?: boolean;
}> = ({ treatment, onPress, isAyurvedaClinic = false }) => {
  const effectivePrice = treatment.price || treatment.base_price;
  const doshaInfo = getDoshaSummary(treatment.dosha_benefits);

  return (
    <TouchableOpacity
      style={[styles.treatmentCard, !treatment.is_active && styles.cardInactive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${treatment.name}, ${formatPrice(effectivePrice)}, ${formatDuration(treatment.duration_minutes)}`}
    >
      <View style={styles.treatmentIcon}>
        <Ionicons name="leaf" size={24} color="#2F6F4E" />
      </View>

      <View style={styles.treatmentInfo}>
        <View style={styles.treatmentHeader}>
          <Text style={styles.treatmentName} numberOfLines={1}>
            {treatment.name}
          </Text>
          {!treatment.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
        </View>

        <Text style={styles.treatmentCode}>{treatment.code}</Text>

        <View style={styles.treatmentMeta}>
          {treatment.duration_minutes && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{formatDuration(treatment.duration_minutes)}</Text>
            </View>
          )}
          {effectivePrice && (
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={14} color="#2F6F4E" />
              <Text style={[styles.metaText, styles.priceText]}>
                {formatPrice(effectivePrice)}
              </Text>
            </View>
          )}
        </View>

        {/* Dosha Benefits - Only show for Ayurveda clinics */}
        {isAyurvedaClinic && treatment.dosha_benefits && (
          <View style={styles.doshaRow}>
            {treatment.dosha_benefits.vata?.balances && (
              <View style={[styles.doshaBadge, { backgroundColor: DOSHA_COLORS.vata + '15' }]}>
                <Text style={[styles.doshaText, { color: DOSHA_COLORS.vata }]}>Vata</Text>
              </View>
            )}
            {treatment.dosha_benefits.pitta?.balances && (
              <View style={[styles.doshaBadge, { backgroundColor: DOSHA_COLORS.pitta + '15' }]}>
                <Text style={[styles.doshaText, { color: DOSHA_COLORS.pitta }]}>Pitta</Text>
              </View>
            )}
            {treatment.dosha_benefits.kapha?.balances && (
              <View style={[styles.doshaBadge, { backgroundColor: DOSHA_COLORS.kapha + '15' }]}>
                <Text style={[styles.doshaText, { color: DOSHA_COLORS.kapha }]}>Kapha</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

export const TreatmentsScreen: React.FC = () => {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const tenantId = currentUser?.tenantId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  // Get feature configuration from JWT token
  const features = useFeatures();
  
  // Fetch tenant data (keeping for backward compatibility, but features come from JWT now)
  const { data: tenant } = useCurrentTenantQuery(tenantId, {
    enabled: !!tenantId,
  });

  // Check if clinic is Ayurveda type using feature flags from JWT
  const isAyurvedaClinic = checkIsAyurveda(features);
  
  // Debounce search query - only trigger API call after user stops typing
  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);
  
  // Only use search query if >= 3 characters
  const effectiveSearchQuery = debouncedSearchQuery.length >= MIN_SEARCH_LENGTH 
    ? debouncedSearchQuery 
    : '';

  // Two parallel queries — always fetch both so we have accurate counts
  const activeTreatmentsQuery = useTreatmentsListQuery(
    tenantId,
    { limit: 100, is_active: true },
    { enabled: !!tenantId && effectiveSearchQuery === '' }
  );
  const inactiveTreatmentsQuery = useTreatmentsListQuery(
    tenantId,
    { limit: 100, is_active: false },
    { enabled: !!tenantId && effectiveSearchQuery === '' }
  );

  // The query whose items we display (based on filter selection)
  const treatmentsQuery = showInactive ? inactiveTreatmentsQuery : activeTreatmentsQuery;
  
  const searchTreatmentsQuery = useSearchTreatmentsQuery(
    tenantId,
    effectiveSearchQuery,
    100,
    { enabled: !!tenantId && effectiveSearchQuery.length >= MIN_SEARCH_LENGTH }
  );

  const deleteMutation = useDeleteTreatmentMutation(tenantId);

  // Combine data sources: use search results when searching, list results otherwise
  const treatmentsData = effectiveSearchQuery 
    ? searchTreatmentsQuery.data 
    : treatmentsQuery.data;
    
  const isLoading = effectiveSearchQuery 
    ? searchTreatmentsQuery.isLoading 
    : treatmentsQuery.isLoading;
    
  const isRefetching = effectiveSearchQuery 
    ? searchTreatmentsQuery.isRefetching 
    : (activeTreatmentsQuery.isRefetching || inactiveTreatmentsQuery.isRefetching);

  const handleRefresh = useCallback(() => {
    if (effectiveSearchQuery) {
      searchTreatmentsQuery.refetch();
    } else {
      activeTreatmentsQuery.refetch();
      inactiveTreatmentsQuery.refetch();
    }
  }, [effectiveSearchQuery, searchTreatmentsQuery, activeTreatmentsQuery, inactiveTreatmentsQuery]);

  const handleDeleteTreatment = useCallback((treatment: TreatmentResponse) => {
    Alert.alert(
      'Delete Treatment',
      `Are you sure you want to delete "${treatment.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(treatment.id);
              Alert.alert('Success', 'Treatment deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete treatment');
            }
          },
        },
      ]
    );
  }, [deleteMutation]);

  // Client-side filtering for partial search (< 3 chars) when not using search API
  const filteredTreatments = useMemo(() => {
    const treatments = treatmentsData?.items || [];
    
    // If search query is 1-2 characters, filter client-side
    if (searchQuery.length > 0 && searchQuery.length < MIN_SEARCH_LENGTH) {
      const query = searchQuery.toLowerCase();
      return treatments.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.code.toLowerCase().includes(query)
      );
    }
    
    return treatments;
  }, [treatmentsData?.items, searchQuery]);

  const renderTreatment = useCallback(({ item }: { item: TreatmentResponse }) => (
    <TreatmentCard
      treatment={item}
      onPress={() => router.push(`/clinic-admin/settings/treatments/${item.id}` as any)}
      isAyurvedaClinic={isAyurvedaClinic}
    />
  ), [router, isAyurvedaClinic]);

  const activeTreatments = activeTreatmentsQuery.data?.total || 0;
  const inactiveTreatments = inactiveTreatmentsQuery.data?.total || 0;

  if (!tenantId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader
          title="Treatments"
          subtitle="No clinic selected"
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>No clinic context available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Treatments & Services"
        subtitle={`${activeTreatments} active treatments`}        onBackPress={() => router.back()}
      />

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search treatments... (min ${MIN_SEARCH_LENGTH} chars)`}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/clinic-admin/settings/treatments/create' as any)}
          accessibilityLabel="Add new treatment"
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats / Filter */}
      <MultiDayAppointmentsSetting />
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={[styles.statCard, !showInactive && { backgroundColor: '#10B98120', borderColor: '#10B981', borderWidth: 1 }]}
          onPress={() => setShowInactive(false)}
        >
          <Text style={[styles.statValue, { color: '#10B981' }]}>{activeTreatments}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, showInactive && { backgroundColor: '#F59E0B20', borderColor: '#F59E0B', borderWidth: 1 }]}
          onPress={() => setShowInactive(true)}
        >
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{inactiveTreatments}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </TouchableOpacity>
      </View>

      {/* Treatment List */}
      <FlatList
        data={filteredTreatments}
        keyExtractor={(item) => item.id}
        renderItem={renderTreatment}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={['#2F6F4E']}
            tintColor="#2F6F4E"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No treatments found' : 'No treatments configured'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Add Ayurvedic treatments and services'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body1,
    color: '#1F2937',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2F6F4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    ...typography.h5,
    color: '#1F2937',
  },
  statLabel: {
    ...typography.caption,
    color: '#6B7280',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  treatmentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardInactive: {
    opacity: 0.6,
  },
  treatmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2F6F4E15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  treatmentName: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    ...typography.caption,
    color: '#6B7280',
    fontSize: 10,
  },
  treatmentCode: {
    ...typography.caption,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  treatmentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: '#6B7280',
  },
  priceText: {
    color: '#2F6F4E',
    fontWeight: '600',
  },
  doshaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  doshaBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  doshaText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.h6,
    color: '#1F2937',
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body2,
    color: '#6B7280',
    marginTop: spacing.xs,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.h6,
    color: '#1F2937',
    marginTop: spacing.md,
  },
});

export default TreatmentsScreen;
