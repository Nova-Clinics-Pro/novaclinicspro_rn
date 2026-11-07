/**
 * Episode Selector Modal Component
 * Modal wrapper for episode selection with data fetching
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { Episode } from '../../data/models/episodes.dtos';
import { EpisodeSelector } from './EpisodeSelector';
import { EpisodeFormModal } from './EpisodeFormModal';

// ============================================
// TYPES
// ============================================

interface EpisodeSelectorModalProps {
  visible: boolean;
  clientId: string;
  tenantId: string;
  onClose: () => void;
  onSelect: (episode: Episode) => void;
  // Data fetching props
  episodes: Episode[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  // Mutation props
  onAttachEpisode?: (episodeId: string) => Promise<void>;
  isAttaching?: boolean;
  // Create episode props
  onCreateEpisode?: (data: any) => Promise<Episode>;
  isCreating?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const EpisodeSelectorModal: React.FC<EpisodeSelectorModalProps> = ({
  visible,
  clientId,
  tenantId,
  onClose,
  onSelect,
  episodes,
  loading = false,
  error = false,
  onRetry,
  onAttachEpisode,
  isAttaching = false,
  onCreateEpisode,
  isCreating = false,
}) => {
  const theme = useClinicTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSelect = async (episode: Episode) => {
    // Check if episode is closed
    if (episode.status === 'CLOSED') {
      Alert.alert(
        'Cannot Link to Closed Episode',
        'This episode is closed. Please select an active episode or reopen it from the client profile.',
        [{ text: 'OK' }]
      );
      return;
    }

    // If onAttachEpisode is provided, call it
    if (onAttachEpisode) {
      try {
        await onAttachEpisode(episode.id);
        onSelect(episode);
        onClose();
      } catch (error: any) {
        // Check for EPISODE_CLOSED error
        if (error.error_code === 'EPISODE_CLOSED' || error.message?.includes('CLOSED')) {
          Alert.alert(
            'Cannot Link to Closed Episode',
            'This episode is closed. Please select another episode or reopen it from the client profile.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error',
            error.message || 'Failed to link episode. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } else {
      // Just call onSelect and close
      onSelect(episode);
      onClose();
    }
  };

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (data: any) => {
    if (onCreateEpisode) {
      try {
        const newEpisode = await onCreateEpisode({
          ...data,
          client_id: clientId,
        });
        setShowCreateModal(false);
        // Automatically select the newly created episode
        if (onAttachEpisode) {
          await onAttachEpisode(newEpisode.id);
        }
        onSelect(newEpisode);
        onClose();
      } catch (error: any) {
        Alert.alert(
          'Error',
          error.message || 'Failed to create episode. Please try again.',
          [{ text: 'OK' }]
        );
        throw error; // Re-throw to keep modal open
      }
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView
          style={[styles.container, { backgroundColor: theme.colors.background.default }]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: theme.colors.border.default,
                backgroundColor: theme.colors.surface.default,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isAttaching}
            >
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Select Episode
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <EpisodeSelector
              episodes={episodes}
              loading={loading}
              error={error}
              onSelect={handleSelect}
              onCreateNew={onCreateEpisode ? handleCreateNew : undefined}
              onRetry={onRetry}
              showSearch={episodes.length > 5}
            />
          </View>

          {/* Loading Overlay */}
          {isAttaching && (
            <View style={styles.loadingOverlay}>
              <View
                style={[
                  styles.loadingCard,
                  { backgroundColor: theme.colors.background.default },
                ]}
              >
                <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
                  Linking episode...
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Create Episode Modal */}
      {onCreateEpisode && (
        <EpisodeFormModal
          visible={showCreateModal}
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSubmit}
          isLoading={isCreating}
        />
      )}
    </>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
