/**
 * Client Episodes List Component
 * Displays paginated list of episodes for a client with status filtering
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { episodeActionAccess } from '../../domain/episodeActionAccess';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { 
  useInfiniteEpisodesQuery,
  useCreateEpisodeMutation,
} from '../../data/repositories/episodes.repository.impl';
import { EpisodeListItem } from './EpisodeListItem';
import { EpisodeStatus, EpisodeCreateRequest, EpisodeUpdateRequest } from '../../data/models/episodes.dtos';
import { EpisodeFormModal } from './EpisodeFormModal';

interface ClientEpisodesListProps {
  clientId: string;
  clientName?: string;
}

type StatusFilter = 'ALL' | EpisodeStatus;

export const ClientEpisodesList: React.FC<ClientEpisodesListProps> = ({
  clientId,
  clientName,
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  
  console.log('[ClientEpisodesList] Render:', {
    tenantId,
    tenantIdType: typeof tenantId,
    currentUser: currentUser ? 'exists' : 'null',
    clientId,
  });
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Ensure clientId is a string, not an array from route params
  const clientIdString = Array.isArray(clientId) ? clientId[0] : clientId;

  // Follows the backend's effective permissions (episode.create), not a list of role names.
  const { canCreateEpisode } = episodeActionAccess(currentUser?.permissions);

  console.log('[ClientEpisodesList] canCreateEpisode:', canCreateEpisode);

  // Query with infinite scroll
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteEpisodesQuery(
    tenantId,
    {
      client_id: clientIdString,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: 10,
    },
    {
      enabled: !!tenantId && !!clientIdString && tenantId !== 'undefined',
    }
  );

  const episodes = data?.pages.flatMap((page) => page.items) || [];

  // Mutations
  const createMutation = useCreateEpisodeMutation();

  const handleEpisodePress = (episodeId: string) => {
    router.push(`/clinic-admin/episodes/${episodeId}` as any);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleCreateEpisode = useCallback(async (formData: EpisodeCreateRequest | EpisodeUpdateRequest) => {
    try {
      // Type guard to ensure we're in create mode
      const createData = formData as EpisodeCreateRequest;
      await createMutation.mutateAsync({
        tenantId,
        data: {
          ...createData,
          client_id: clientIdString,
        },
      });
      setShowCreateModal(false);
      Alert.alert(
        t('common.success') || 'Success',
        t('episodes.episodeCreated') || 'Episode created successfully'
      );
      refetch();
    } catch (err: any) {
      Alert.alert(
        t('common.error') || 'Error',
        err.message || t('episodes.createFailed') || 'Failed to create episode'
      );
    }
  }, [createMutation, tenantId, clientIdString, t, refetch]);

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          statusFilter === 'ALL' && styles.filterButtonActive,
        ]}
        onPress={() => setStatusFilter('ALL')}
      >
        <Text
          style={[
            styles.filterButtonText,
            statusFilter === 'ALL' && styles.filterButtonTextActive,
          ]}
        >
          All
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          statusFilter === 'ACTIVE' && styles.filterButtonActive,
        ]}
        onPress={() => setStatusFilter('ACTIVE')}
      >
        <Text
          style={[
            styles.filterButtonText,
            statusFilter === 'ACTIVE' && styles.filterButtonTextActive,
          ]}
        >
          Active
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          statusFilter === 'CLOSED' && styles.filterButtonActive,
        ]}
        onPress={() => setStatusFilter('CLOSED')}
      >
        <Text
          style={[
            styles.filterButtonText,
            statusFilter === 'CLOSED' && styles.filterButtonTextActive,
          ]}
        >
          Closed
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={64} color={colors.text.tertiary} />
        <Text style={styles.emptyTitle}>
          {statusFilter === 'ALL'
            ? t('episodes.noEpisodesFound') || 'No episodes yet'
            : `No ${statusFilter.toLowerCase()} episodes`}
        </Text>
        <Text style={styles.emptyText}>
          {statusFilter === 'ALL'
            ? t('episodes.createFirstEpisode') || 'Create an episode to start tracking this client\'s care journey'
            : `This client has no ${statusFilter.toLowerCase()} episodes`}
        </Text>
        {canCreateEpisode && (
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color={colors.background.default} />
            <Text style={styles.createButtonText}>
              {t('episodes.createNewEpisode') || 'Create New Episode'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={64} color={colors.error.main} />
      <Text style={styles.errorTitle}>Could not load episodes</Text>
      <Text style={styles.errorText}>
        {error?.message || 'An error occurred'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary.main} />
      </View>
    );
  };

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('episodes.episodes') || 'Episodes'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        {renderStatusFilter()}
        {renderError()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {t('episodes.episodes') || 'Episodes'}
          </Text>
          {clientName && (
            <Text style={styles.headerSubtitle}>{clientName}</Text>
          )}
        </View>
        {canCreateEpisode && (
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color={colors.primary.main} />
          </TouchableOpacity>
        )}
      </View>

      {renderStatusFilter()}
      
      <FlatList
        data={episodes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EpisodeListItem episode={item} onPress={() => handleEpisodePress(item.id)} />
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary.main]}
          />
        }
        contentContainerStyle={episodes.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Episode Modal */}
      <EpisodeFormModal
        visible={showCreateModal}
        mode="create"
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEpisode}
        isLoading={createMutation.isPending}
      />
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
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  headerButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.grey[50],
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary.main,
  },
  filterButtonText: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: colors.background.default,
  },
  list: {
    padding: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  createButtonText: {
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
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
