/**
 * Staff Feedback List Screen
 * Displays feedback list for a specific staff member (doctor or therapist)
 * Can be used from both doctor and therapist dashboards
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { FeedbackListItem } from '../components/FeedbackListItem';
import { PeriodSelector } from '../components/PeriodSelector';
import { useStaffFeedbackListQuery } from '../../data/repositories/feedback.repository.impl';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import type { StaffFeedbackItem, KPIPeriod, StaffType } from '../../data/models/feedback.dtos';
import { getDefaultDateRange } from '../../domain/entities/feedback.entity';

const PAGE_SIZE = 20;

interface StaffFeedbackListScreenProps {
  staffType?: StaffType;
  staffId?: string;
}

export const StaffFeedbackListScreen: React.FC<StaffFeedbackListScreenProps> = ({
  staffType: propStaffType,
  staffId: propStaffId,
}) => {
  const router = useRouter();
  const params = useLocalSearchParams<{ staffType?: string; staffId?: string }>();
  const { currentUser } = useAuth();
  
  const tenantId = currentUser?.tenantId || '';
  const staffId = propStaffId || params.staffId || currentUser?.userId || '';
  const staffType = (propStaffType || params.staffType || 'therapist') as StaffType;

  // State
  const [period, setPeriod] = useState<KPIPeriod>('30d');
  const [offset, setOffset] = useState(0);
  const [allItems, setAllItems] = useState<StaffFeedbackItem[]>([]);

  // Calculate date range from period
  const dateRange = useMemo(() => {
    const today = new Date();
    let fromDate: Date;
    
    switch (period) {
      case '7d':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 7);
        break;
      case '90d':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 90);
        break;
      case '30d':
      default:
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 30);
        break;
    }

    return {
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: today.toISOString().split('T')[0],
    };
  }, [period]);

  // Query
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useStaffFeedbackListQuery(
    tenantId,
    staffId,
    {
      staffType,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      limit: PAGE_SIZE,
      offset,
    },
    {
      enabled: !!tenantId && !!staffId,
    }
  );

  // Update items when data changes
  React.useEffect(() => {
    if (data?.items) {
      if (offset === 0) {
        setAllItems(data.items);
      } else {
        setAllItems((prev) => [...prev, ...data.items]);
      }
    }
  }, [data, offset]);

  // Handlers
  const handlePeriodChange = useCallback((newPeriod: KPIPeriod) => {
    setPeriod(newPeriod);
    setOffset(0);
    setAllItems([]);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (data && allItems.length < data.total && !isLoading) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  }, [data, allItems.length, isLoading]);

  const handleRefresh = useCallback(() => {
    setOffset(0);
    setAllItems([]);
    refetch();
  }, [refetch]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Render item
  const renderItem = useCallback(({ item }: { item: StaffFeedbackItem }) => (
    <FeedbackListItem
      item={item}
      testID={`feedback-item-${item.id}`}
    />
  ), []);

  // Empty state
  const renderEmpty = () => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={48} color={colors.text.tertiary} />
        <Text style={styles.emptyTitle}>No Feedback Yet</Text>
        <Text style={styles.emptyMessage}>
          No feedback received for this period.
        </Text>
      </View>
    );
  };

  // Footer (load more)
  const renderFooter = () => {
    if (!data || allItems.length >= data.total) return null;
    
    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        testID="load-more-button"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary.main} />
        ) : (
          <Text style={styles.loadMoreText}>
            Load More ({allItems.length} of {data.total})
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Error state
  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feedback</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
          <Text style={styles.errorTitle}>Could Not Load Feedback</Text>
          <Text style={styles.errorMessage}>
            There was an error loading feedback data.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {staffType === 'doctor' ? 'Doctor' : 'Therapist'} Feedback
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Period Filter */}
      <View style={styles.filterContainer}>
        <PeriodSelector
          value={period}
          onChange={handlePeriodChange}
          testID="feedback-period-selector"
        />
      </View>

      {/* Summary */}
      {data && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {data.total} {data.total === 1 ? 'response' : 'responses'} in this period
          </Text>
        </View>
      )}

      {/* Feedback List */}
      <FlatList
        data={allItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && offset === 0}
            onRefresh={handleRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        testID="feedback-list"
      />

      {/* Loading overlay for initial load */}
      {isLoading && offset === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  summaryText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyMessage: {
    ...typography.body2,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loadMoreText: {
    ...typography.body2,
    color: colors.primary.main,
    fontWeight: '600',
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
  errorMessage: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
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
    color: colors.common.white,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StaffFeedbackListScreen;
