/**
 * Episode Selector Component
 * List of episodes for selection (used in modals)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { Episode, formatEpisodeDate } from '../../data/models/episodes.dtos';
import { EpisodeStatusBadge } from './EpisodeStatusBadge';

// ============================================
// TYPES
// ============================================

interface EpisodeSelectorProps {
  episodes: Episode[];
  loading?: boolean;
  error?: boolean;
  onSelect: (episode: Episode) => void;
  onCreateNew?: () => void;
  onRetry?: () => void;
  showSearch?: boolean;
}

// ============================================
// EPISODE ITEM COMPONENT
// ============================================

interface EpisodeItemProps {
  episode: Episode;
  onPress: () => void;
  disabled?: boolean;
}

const EpisodeItem: React.FC<EpisodeItemProps> = ({ episode, onPress, disabled }) => {
  const theme = useClinicTheme();
  const isClosed = episode.status === 'CLOSED';

  return (
    <TouchableOpacity
      style={[
        styles.episodeItem,
        {
          backgroundColor: theme.colors.surface.default,
          borderColor: theme.colors.border.default,
        },
        disabled && styles.episodeItemDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || isClosed}
      activeOpacity={0.7}
    >
      <View style={styles.episodeContent}>
        <View style={styles.episodeHeader}>
          <View style={styles.episodeTitleRow}>
            <Ionicons
              name="folder-outline"
              size={16}
              color={isClosed ? theme.colors.text.tertiary : theme.colors.primary.default}
            />
            <Text
              style={[
                styles.episodeTitle,
                {
                  color: isClosed
                    ? theme.colors.text.tertiary
                    : theme.colors.text.primary,
                },
              ]}
              numberOfLines={2}
            >
              {episode.title}
            </Text>
          </View>
          <EpisodeStatusBadge status={episode.status} size="small" />
        </View>

        {!!episode.description && (
          <Text
            style={[
              styles.episodeDescription,
              {
                color: isClosed
                  ? theme.colors.text.tertiary
                  : theme.colors.text.secondary,
              },
            ]}
            numberOfLines={1}
          >
            {episode.description}
          </Text>
        )}

        <View style={styles.episodeStats}>
          <View style={styles.statItem}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={theme.colors.text.tertiary}
            />
            <Text style={[styles.statText, { color: theme.colors.text.tertiary }]}>
              {episode.visits_count} {episode.visits_count === 1 ? 'visit' : 'visits'}
            </Text>
          </View>

          {!!episode.last_visit_date && (
            <View style={styles.statItem}>
              <Ionicons
                name="time-outline"
                size={12}
                color={theme.colors.text.tertiary}
              />
              <Text style={[styles.statText, { color: theme.colors.text.tertiary }]}>
                Last: {formatEpisodeDate(episode.last_visit_date)}
              </Text>
            </View>
          )}
        </View>

        {isClosed && (
          <Text style={[styles.closedNote, { color: theme.colors.feedback.warning }]}>
            This episode is closed. Please select an active episode or reopen it.
          </Text>
        )}
      </View>

      {!isClosed && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.text.tertiary}
        />
      )}
    </TouchableOpacity>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  episodes,
  loading = false,
  error = false,
  onSelect,
  onCreateNew,
  onRetry,
  showSearch = false,
}) => {
  const theme = useClinicTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter episodes based on search query
  const filteredEpisodes = searchQuery
    ? episodes.filter(
        (episode) =>
          episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          episode.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : episodes;

  // Separate active and closed episodes
  const activeEpisodes = filteredEpisodes.filter((e) => e.status === 'ACTIVE');
  const closedEpisodes = filteredEpisodes.filter((e) => e.status === 'CLOSED');

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.default} />
        <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
          Loading episodes...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.feedback.error} />
        <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
          Failed to load episodes
        </Text>
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={onRetry}
          >
            <Text
              style={[styles.retryButtonText, { color: theme.colors.background.default }]}
            >
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      {showSearch && (
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.colors.surface.default,
              borderColor: theme.colors.border.default,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={theme.colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text.primary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search episodes..."
            placeholderTextColor={theme.colors.text.tertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Create New Button */}
      {onCreateNew && (
        <TouchableOpacity
          style={[
            styles.createButton,
            { backgroundColor: theme.colors.primary.default },
          ]}
          onPress={onCreateNew}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.background.default} />
          <Text
            style={[styles.createButtonText, { color: theme.colors.background.default }]}
          >
            Create New Episode
          </Text>
        </TouchableOpacity>
      )}

      {/* Episodes List */}
      <FlatList
        data={[...activeEpisodes, ...closedEpisodes]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EpisodeItem episode={item} onPress={() => onSelect(item)} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="folder-open-outline"
              size={48}
              color={theme.colors.text.tertiary}
            />
            <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
              {searchQuery ? 'No episodes found' : 'No episodes available'}
            </Text>
            {!searchQuery && onCreateNew && (
              <Text style={[styles.emptyHint, { color: theme.colors.text.tertiary }]}>
                Create a new episode to get started
              </Text>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 16,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  episodeItemDisabled: {
    opacity: 0.6,
  },
  episodeContent: {
    flex: 1,
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  episodeTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  episodeTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  episodeDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  episodeStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
  },
  closedNote: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  centerText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
  },
});
