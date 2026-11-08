import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useTranslation } from '../../../../core/localization/useTranslation';
import {
  useEpisodesQuery,
  useAttachEpisodeMutation,
} from '../../data/repositories/episodes.repository.impl';
import { EpisodeListItem } from '../components/EpisodeListItem';

export const LinkEpisodeSheet: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { appointmentId, clientId } = useLocalSearchParams<{
    appointmentId: string;
    clientId: string;
  }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId;

  console.log('[LinkEpisodeSheet] tenantId:', tenantId, 'type:', typeof tenantId);
  console.log('[LinkEpisodeSheet] currentUser:', currentUser);

  // Ensure clientId is a string
  const clientIdString = Array.isArray(clientId) ? clientId[0] : clientId;

  // Fetch active episodes for the client
  const {
    data: episodesResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useEpisodesQuery(tenantId || '', {
    client_id: clientIdString,
    status: 'ACTIVE',
    skip: 0,
    limit: 50,
  }, {
    enabled: !!tenantId && tenantId !== 'undefined' && !!clientIdString, // Only fetch when we have valid tenantId and clientId
  });

  // Attach episode mutation
  const attachMutation = useAttachEpisodeMutation();

  const handleEpisodeSelect = async (episodeId: string) => {
    if (!tenantId) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }
    
    try {
      await attachMutation.mutateAsync({ 
        tenantId,
        appointmentId: appointmentId || '',
        episodeId,
      });
      Alert.alert('Success', 'Appointment linked to episode');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to link episode');
    }
  };

  const handleCreateNew = () => {
    router.push(
      `/clinic-admin/appointments/${appointmentId}/create-episode?clientId=${clientIdString}` as any
    );
  };

  const episodes = episodesResponse?.items || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to appointment details"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Link to episode</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Info text */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {t('episodes.linkEpisodeHelpText')}
          </Text>
        </View>

        {/* Create New Episode Option - Always visible at top */}
        {!isLoading && !isError && (
          <TouchableOpacity 
            style={styles.createNewCard} 
            onPress={handleCreateNew}
            accessibilityRole="button"
            accessibilityLabel="Create new episode"
          >
            <View style={styles.createNewIconContainer}>
              <Ionicons name="add-circle" size={32} color={colors.primary.main} />
            </View>
            <View style={styles.createNewContent}>
              <Text style={styles.createNewTitle}>Create New Episode</Text>
              <Text style={styles.createNewSubtitle}>
                Start a new episode for this condition or treatment plan
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}

        {/* Divider */}
        {!isLoading && !isError && episodes.length > 0 && (
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SELECT EXISTING</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.loadingText}>Loading episodes...</Text>
          </View>
        )}

        {/* Error state */}
        {isError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.error.main} />
            <Text style={styles.errorTitle}>Could not load episodes</Text>
            <Text style={styles.errorText}>{error?.message || 'An error occurred'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Episodes list */}
        {!isLoading && !isError && episodes.length > 0 && (
          <View style={styles.episodesList}>
            {episodes.map((episode) => (
              <EpisodeListItem
                key={episode.id}
                episode={episode}
                onPress={() => handleEpisodeSelect(episode.id)}
              />
            ))}
          </View>
        )}

        {/* Empty state */}
        {!isLoading && !isError && episodes.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No active episodes</Text>
            <Text style={styles.emptyText}>
              This client doesn&apos;t have any active episodes yet. You can create a new episode for
              this appointment.
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateNew}>
              <Ionicons name="add" size={20} color={colors.background.default} />
              <Text style={styles.createButtonText}>Create new episode</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.info.main + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info.main,
  },
  infoText: {
    ...typography.body2,
    color: colors.text.primary,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
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
  episodesList: {
    gap: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
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
    marginBottom: spacing.lg,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  createButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
  createNewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary.main,
    borderStyle: 'dashed',
  },
  createNewIconContainer: {
    marginRight: spacing.md,
  },
  createNewContent: {
    flex: 1,
  },
  createNewTitle: {
    ...typography.body1,
    color: colors.primary.main,
    fontWeight: '600',
    marginBottom: 4,
  },
  createNewSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginHorizontal: spacing.md,
    fontWeight: '600',
  },
});

export default LinkEpisodeSheet;
