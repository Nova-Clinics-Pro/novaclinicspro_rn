/**
 * All Episodes Screen
 * Displays all episodes for a specific client
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useEpisodesQuery } from '../../data/repositories/episodes.repository.impl';
import { EpisodeStatusBadge } from '../components/EpisodeStatusBadge';
import { formatEpisodeDate, EpisodeStatus } from '../../data/models/episodes.dtos';

// ============================================
// TYPES
// ============================================

interface AllEpisodesScreenProps {
  tenantId: string;
  clientId: string;
  clientName?: string;
  onEpisodePress?: (episodeId: string) => void;
  onCreateEpisode?: () => void;
  onBack?: () => void;
}

// ============================================
// EPISODE CARD COMPONENT
// ============================================

interface EpisodeCardProps {
  episodeId: string;
  title: string;
  description?: string;
  status: EpisodeStatus;
  startDate: string;
  lastVisitDate?: string;
  visitsCount: number;
  onPress?: () => void;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({
  title,
  description,
  status,
  startDate,
  lastVisitDate,
  visitsCount,
  onPress,
}) => {
  const theme = useClinicTheme();

  return (
    <TouchableOpacity
      style={[styles.episodeCard, { backgroundColor: theme.colors.background.default }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.episodeHeader}>
        <View style={styles.episodeTitleContainer}>
          <Text style={[styles.episodeTitle, { color: theme.colors.text.primary }]}>
            {title}
          </Text>
          <EpisodeStatusBadge status={status} />
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
      </View>

      {!!description && (
        <Text
          style={[styles.episodeDescription, { color: theme.colors.text.secondary }]}
          numberOfLines={2}
        >
          {description}
        </Text>
      )}

      <View style={styles.episodeMetadata}>
        <View style={styles.metadataItem}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.text.tertiary} />
          <Text style={[styles.metadataText, { color: theme.colors.text.secondary }]}>
            Started {formatEpisodeDate(startDate)}
          </Text>
        </View>

        {!!lastVisitDate && (
          <View style={styles.metadataItem}>
            <Ionicons name="time-outline" size={14} color={theme.colors.text.tertiary} />
            <Text style={[styles.metadataText, { color: theme.colors.text.secondary }]}>
              Last visit {formatEpisodeDate(lastVisitDate)}
            </Text>
          </View>
        )}

        <View style={styles.metadataItem}>
          <Ionicons name="medical-outline" size={14} color={theme.colors.text.tertiary} />
          <Text style={[styles.metadataText, { color: theme.colors.text.secondary }]}>
            {visitsCount} {visitsCount === 1 ? 'visit' : 'visits'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AllEpisodesScreen: React.FC<AllEpisodesScreenProps> = ({
  tenantId,
  clientId,
  clientName,
  onEpisodePress,
  onCreateEpisode,
  onBack,
}) => {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<EpisodeStatus | undefined>(undefined);

  // Fetch episodes for this client
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useEpisodesQuery(
    tenantId,
    { client_id: clientId, status: statusFilter },
    { enabled: !!tenantId && !!clientId }
  );

  const episodes = data?.items || [];
  const activeEpisodes = episodes.filter(e => e.status === 'ACTIVE');
  const closedEpisodes = episodes.filter(e => e.status === 'CLOSED');

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.default} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading episodes...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.feedback.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.text.primary }]}>
            Failed to Load Episodes
          </Text>
          <Text style={[styles.errorMessage, { color: theme.colors.text.secondary }]}>
            Unable to load episodes. Please try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.background.default }]}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.colors.primary.default}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.default }]}>
          {/* Back Button */}
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          )}

          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              {t('episodes.episodes')}
            </Text>
            {!!clientName && (
              <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
                {clientName}
              </Text>
            )}
          </View>

          {/* Create Episode Button */}
          {onCreateEpisode && (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.primary.default }]}
              onPress={onCreateEpisode}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={theme.colors.background.default} />
              <Text style={[styles.createButtonText, { color: theme.colors.background.default }]}>
                New
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterTabs, { borderBottomColor: theme.colors.border.default }]}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              !statusFilter && { borderBottomColor: theme.colors.primary.default, borderBottomWidth: 2 }
            ]}
            onPress={() => setStatusFilter(undefined)}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: !statusFilter ? theme.colors.primary.default : theme.colors.text.secondary }
              ]}
            >
              All ({episodes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              statusFilter === 'ACTIVE' && { borderBottomColor: theme.colors.primary.default, borderBottomWidth: 2 }
            ]}
            onPress={() => setStatusFilter('ACTIVE')}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: statusFilter === 'ACTIVE' ? theme.colors.primary.default : theme.colors.text.secondary }
              ]}
            >
              Active ({activeEpisodes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              statusFilter === 'CLOSED' && { borderBottomColor: theme.colors.primary.default, borderBottomWidth: 2 }
            ]}
            onPress={() => setStatusFilter('CLOSED')}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: statusFilter === 'CLOSED' ? theme.colors.primary.default : theme.colors.text.secondary }
              ]}
            >
              Closed ({closedEpisodes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Episodes List */}
        <View style={styles.episodesList}>
          {episodes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={64} color={theme.colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                {t('episodes.noEpisodesFound')}
              </Text>
              <Text style={[styles.emptyMessage, { color: theme.colors.text.secondary }]}>
                {t('episodes.createFirstEpisode')}
              </Text>
              {onCreateEpisode && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: theme.colors.primary.default }]}
                  onPress={onCreateEpisode}
                >
                  <Text style={[styles.emptyButtonText, { color: theme.colors.background.default }]}>
                    {t('episodes.createNewEpisode')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            episodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episodeId={episode.id}
                title={episode.title}
                description={episode.description}
                status={episode.status}
                startDate={episode.start_date}
                lastVisitDate={episode.last_visit_date}
                visitsCount={episode.visits_count}
                onPress={() => onEpisodePress?.(episode.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  filterTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  episodesList: {
    padding: 20,
    gap: 16,
  },
  episodeCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  episodeTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  episodeDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  episodeMetadata: {
    gap: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
