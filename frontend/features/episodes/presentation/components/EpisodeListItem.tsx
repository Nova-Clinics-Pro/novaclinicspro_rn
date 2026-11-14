/**
 * Episode List Item Component
 * List item for episode lists in client details
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { Episode, formatEpisodeDate } from '../../data/models/episodes.dtos';
import { EpisodeStatusBadge } from './EpisodeStatusBadge';

// ============================================
// TYPES
// ============================================

interface EpisodeListItemProps {
  episode: Episode;
  onPress: (episode: Episode) => void;
}

// ============================================
// COMPONENT
// ============================================

export const EpisodeListItem: React.FC<EpisodeListItemProps> = ({
  episode,
  onPress,
}) => {
  const theme = useClinicTheme();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      onPress={() => onPress(episode)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Episode: ${episode.title}`}
    >
      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="folder-outline" size={18} color={theme.colors.primary.default} />
            <Text
              style={[styles.title, { color: theme.colors.text.primary }]}
              numberOfLines={2}
            >
              {episode.title}
            </Text>
          </View>
          <EpisodeStatusBadge status={episode.status} size="small" />
        </View>

        {/* Description */}
        {!!episode.description && (
          <Text
            style={[styles.description, { color: theme.colors.text.secondary }]}
            numberOfLines={2}
          >
            {episode.description}
          </Text>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={12} color={theme.colors.text.tertiary} />
            <Text style={[styles.statText, { color: theme.colors.text.tertiary }]}>
              {episode.visits_count} {episode.visits_count === 1 ? 'visit' : 'visits'}
            </Text>
          </View>

          {!!episode.last_visit_date && (
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={12} color={theme.colors.text.tertiary} />
              <Text style={[styles.statText, { color: theme.colors.text.tertiary }]}>
                Last: {formatEpisodeDate(episode.last_visit_date)}
              </Text>
            </View>
          )}
        </View>

        {/* Dates Row */}
        <View style={styles.datesRow}>
          <Text style={[styles.dateText, { color: theme.colors.text.tertiary }]}>
            Started: {formatEpisodeDate(episode.start_date)}
          </Text>
          {!!episode.end_date && (
            <Text style={[styles.dateText, { color: theme.colors.text.tertiary }]}>
              Ended: {formatEpisodeDate(episode.end_date)}
            </Text>
          )}
        </View>
      </View>

      {/* Navigation Arrow */}
      <View style={styles.arrow}>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.primary.default} />
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
  },
  datesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dateText: {
    fontSize: 11,
  },
  arrow: {
    marginLeft: 8,
  },
});
