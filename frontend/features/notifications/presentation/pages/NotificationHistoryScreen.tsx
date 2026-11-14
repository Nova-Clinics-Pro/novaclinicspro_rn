/**
 * Notification History Screen
 * Displays paginated list of past notifications from the backend
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  useNotificationHistory,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} from '../../data/repositories/push-notifications.repository.impl';
import { NotificationHistoryItem } from '../../data/datasources/push-notifications.api';
import { getNotificationDeepLink } from '../../data/models/push.dtos';

interface NotificationItemProps {
  item: NotificationHistoryItem;
  onPress: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  item,
  onPress,
  onMarkRead,
  onDelete,
}) => {
  const formattedDate = useMemo(() => {
    const date = new Date(item.created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, [item.created_at]);

  const getNotificationIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      appointment_new: 'calendar',
      appointment_updated: 'calendar-outline',
      appointment_cancelled: 'calendar-clear',
      appointment_no_show: 'person-remove',
      schedule_summary: 'today',
      critical_update: 'warning',
      leave_approved: 'checkmark-circle',
      leave_rejected: 'close-circle',
      default: 'notifications',
    };
    return iconMap[type] || iconMap.default;
  };

  const handleSwipeDelete = () => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
      onPress={onPress}
      onLongPress={handleSwipeDelete}
      activeOpacity={0.7}
      data-testid={`notification-item-${item.id}`}
    >
      <View style={[styles.iconContainer, !item.is_read && styles.unreadIconContainer]}>
        <Ionicons
          name={getNotificationIcon(item.notification_type) as any}
          size={24}
          color={!item.is_read ? colors.primary.main : colors.text.secondary}
        />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !item.is_read && styles.unreadTitle]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        
        <Text style={styles.time}>{formattedDate}</Text>
      </View>

      <View style={styles.actionContainer}>
        {!item.is_read && (
          <TouchableOpacity
            style={styles.markReadButton}
            onPress={onMarkRead}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="checkmark" size={20} color={colors.primary.main} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleSwipeDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error.light} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Ionicons name="notifications-off-outline" size={64} color={colors.grey[300]} />
    <Text style={styles.emptyTitle}>No Notifications</Text>
    <Text style={styles.emptyDescription}>
      You&apos;ll see your notifications here when you receive them
    </Text>
  </View>
);

export const NotificationHistoryScreen: React.FC = () => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || null;

  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Queries and mutations
  const { 
    data: historyData, 
    isLoading, 
    isFetching,
    refetch,
    error,
  } = useNotificationHistory(tenantId, { page, page_size: pageSize });

  const markReadMutation = useMarkNotificationReadMutation(tenantId);
  const markAllReadMutation = useMarkAllNotificationsReadMutation(tenantId);
  const deleteMutation = useDeleteNotificationMutation(tenantId);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setPage(1);
    await refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (historyData?.has_next && !isFetching) {
      setPage(prev => prev + 1);
    }
  }, [historyData?.has_next, isFetching]);

  const handleNotificationPress = useCallback((item: NotificationHistoryItem) => {
    // Mark as read if unread
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }

    // Navigate to deep link if available
    if (item.deep_link) {
      router.push(item.deep_link as any);
    } else if (item.data) {
      const route = getNotificationDeepLink(item.data as any);
      if (route) {
        router.push(route as any);
      }
    }
  }, [router, markReadMutation]);

  const handleMarkRead = useCallback((notificationId: string) => {
    markReadMutation.mutate(notificationId);
  }, [markReadMutation]);

  const handleDelete = useCallback((notificationId: string) => {
    deleteMutation.mutate(notificationId);
  }, [deleteMutation]);

  const unreadCount = historyData?.unread_count;
  const handleMarkAllRead = useCallback(() => {
    if (!unreadCount) return;

    Alert.alert(
      'Mark All as Read',
      `Mark all ${unreadCount} unread notifications as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark All Read', 
          onPress: () => markAllReadMutation.mutate(),
        },
      ]
    );
  }, [unreadCount, markAllReadMutation]);

  const renderItem = useCallback(({ item }: { item: NotificationHistoryItem }) => (
    <NotificationItem
      item={item}
      onPress={() => handleNotificationPress(item)}
      onMarkRead={() => handleMarkRead(item.id)}
      onDelete={() => handleDelete(item.id)}
    />
  ), [handleNotificationPress, handleMarkRead, handleDelete]);

  const renderFooter = useCallback(() => {
    if (!isFetching || page === 1) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary.main} />
      </View>
    );
  }, [isFetching, page]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          data-testid="back-button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Notifications</Text>
        
        {historyData?.unread_count ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {historyData.unread_count > 99 ? '99+' : historyData.unread_count}
            </Text>
          </View>
        ) : null}

        <View style={styles.headerSpacer} />

        {historyData?.unread_count ? (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            data-testid="mark-all-read-button"
          >
            {markAllReadMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primary.main} />
            ) : (
              <Ionicons name="checkmark-done" size={24} color={colors.primary.main} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color={colors.error.main} />
          <Text style={styles.errorText}>Failed to load notifications</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={historyData?.items || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            !historyData?.items?.length && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && page === 1}
              onRefresh={handleRefresh}
              tintColor={colors.primary.main}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
        />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  unreadBadge: {
    backgroundColor: colors.error.main,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  unreadBadgeText: {
    ...typography.caption,
    color: colors.common.white,
    fontWeight: '700',
    fontSize: 12,
  },
  headerSpacer: {
    flex: 1,
  },
  markAllButton: {
    padding: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.main + '15',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 12,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body2,
    color: colors.error.main,
    flex: 1,
  },
  retryText: {
    ...typography.button,
    color: colors.error.main,
    fontWeight: '600',
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
  listContent: {
    paddingVertical: spacing.sm,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  // Notification Item
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    backgroundColor: colors.background.default,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  unreadItem: {
    backgroundColor: colors.primary.main + '08',
    borderColor: colors.primary.main + '30',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.grey[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  unreadIconContainer: {
    backgroundColor: colors.primary.main + '15',
  },
  contentContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    ...typography.subtitle2,
    color: colors.text.primary,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.main,
    marginLeft: spacing.xs,
  },
  body: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  time: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  actionContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
  },
  markReadButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body2,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});

export default NotificationHistoryScreen;
