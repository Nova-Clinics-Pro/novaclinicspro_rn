/**
 * Episode Card Component
 * Displays episode information in appointment detail view
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { Episode } from '../../data/models/episodes.dtos';
import { EpisodeStatusBadge } from './EpisodeStatusBadge';
import { formatEpisodeDate } from '../../data/models/episodes.dtos';

// ============================================
// TYPES
// ============================================

interface EpisodeCardProps {
  episode?: Episode | null;
  loading?: boolean;
  error?: boolean;
  appointmentHasEpisode?: boolean;
  onRetry?: () => void;
  onEpisodePress?: () => void;
  onLinkEpisodePress?: () => void;
  onCreateEpisodePress?: () => void;
  onChangeEpisodePress?: () => void;
}

// ============================================
// SKELETON LOADER
// ============================================

const SkeletonLoader: React.FC = () => {
  const theme = useClinicTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.header}>
        <View style={[styles.skeleton, styles.skeletonTitle, { backgroundColor: theme.colors.border.subtle }]} />
        <View style={[styles.skeleton, styles.skeletonBadge, { backgroundColor: theme.colors.border.subtle }]} />
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.skeleton, styles.skeletonStat, { backgroundColor: theme.colors.border.subtle }]} />
        <View style={[styles.skeleton, styles.skeletonStat, { backgroundColor: theme.colors.border.subtle }]} />
      </View>
    </View>
  );
};

// ============================================
// ERROR STATE
// ============================================

interface ErrorStateProps {
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry }) => {
  const theme = useClinicTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={24} color={theme.colors.feedback.error} />
        <Text style={[styles.errorText, { color: theme.colors.text.secondary }]}>
          Failed to load episode
        </Text>
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={onRetry}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.background.default }]}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ============================================
// NO EPISODE STATE
// ============================================

interface NoEpisodeStateProps {
  onLinkEpisodePress?: () => void;
  onCreateEpisodePress?: () => void;
}

const NoEpisodeState: React.FC<NoEpisodeStateProps> = ({
  onLinkEpisodePress,
  onCreateEpisodePress,
}) => {
  const theme = useClinicTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.noEpisodeContainer}>
        <Ionicons name="folder-open-outline" size={32} color={theme.colors.text.tertiary} />
        <Text style={[styles.noEpisodeText, { color: theme.colors.text.secondary }]}>
          No episode linked
        </Text>
        <View style={styles.ctaRow}>
          {onLinkEpisodePress && (
            <TouchableOpacity
              style={[styles.ctaButton, { borderColor: theme.colors.primary.default }]}
              onPress={onLinkEpisodePress}
            >
              <Ionicons name="link-outline" size={16} color={theme.colors.primary.default} />
              <Text style={[styles.ctaButtonText, { color: theme.colors.primary.default }]}>
                Link to Episode
              </Text>
            </TouchableOpacity>
          )}
          {onCreateEpisodePress && (
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaButtonPrimary, { backgroundColor: theme.colors.primary.default }]}
              onPress={onCreateEpisodePress}
            >
              <Ionicons name="add-circle-outline" size={16} color={theme.colors.background.default} />
              <Text style={[styles.ctaButtonText, { color: theme.colors.background.default }]}>
                Create New Episode
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  loading = false,
  error = false,
  appointmentHasEpisode = false,
  onRetry,
  onEpisodePress,
  onLinkEpisodePress,
  onCreateEpisodePress,
  onChangeEpisodePress,
}) => {
  const theme = useClinicTheme();

  // Loading state
  if (loading) {
    return <SkeletonLoader />;
  }

  // Error state
  if (error) {
    return <ErrorState onRetry={onRetry} />;
  }

  // No episode state
  if (!appointmentHasEpisode || !episode) {
    return (
      <NoEpisodeState
        onLinkEpisodePress={onLinkEpisodePress}
        onCreateEpisodePress={onCreateEpisodePress}
      />
    );
  }

  // Episode exists - show full card
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      onPress={onEpisodePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Episode: ${episode.title}`}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="folder-outline" size={20} color={theme.colors.primary.default} />
          <Text
            style={[styles.title, { color: theme.colors.text.primary }]}
            numberOfLines={2}
          >
            {episode.title}
          </Text>
        </View>
        <EpisodeStatusBadge status={episode.status} />
      </View>

      {!!episode.description && (
        <Text
          style={[styles.description, { color: theme.colors.text.secondary }]}
          numberOfLines={2}
        >
          {episode.description}
        </Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.text.tertiary} />
          <Text style={[styles.statLabel, { color: theme.colors.text.tertiary }]}>
            Visits:
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
            {episode.visits_count}
          </Text>
        </View>

        {!!episode.last_visit_date && (
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color={theme.colors.text.tertiary} />
            <Text style={[styles.statLabel, { color: theme.colors.text.tertiary }]}>
              Last visit:
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
              {formatEpisodeDate(episode.last_visit_date)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {onChangeEpisodePress && (
          <TouchableOpacity
            style={[styles.changeButton, { borderColor: theme.colors.border.default }]}
            onPress={(e) => {
              e.stopPropagation();
              onChangeEpisodePress();
            }}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={theme.colors.primary.default} />
            <Text style={[styles.changeButtonText, { color: theme.colors.primary.default }]}>
              Change Episode
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.viewDetailsHint}>
          <Text style={[styles.viewDetailsText, { color: theme.colors.text.tertiary }]}>
            Tap to view details
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.text.tertiary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewDetailsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
  },

  // Skeleton styles
  skeleton: {
    borderRadius: 4,
  },
  skeletonTitle: {
    width: '60%',
    height: 20,
  },
  skeletonBadge: {
    width: 60,
    height: 24,
  },
  skeletonStat: {
    width: 80,
    height: 16,
  },

  // Error state
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // No episode state
  noEpisodeContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  noEpisodeText: {
    fontSize: 14,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  ctaButtonPrimary: {
    borderWidth: 0,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
