/**
 * Episode Form Modal Component
 * Modal wrapper for episode creation/editing
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import {
  Episode,
  EpisodeCreateRequest,
  EpisodeUpdateRequest,
} from '../../data/models/episodes.dtos';
import { EpisodeForm } from './EpisodeForm';

// ============================================
// TYPES
// ============================================

interface EpisodeFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialData?: Episode;
  onClose: () => void;
  onSubmit: (data: EpisodeCreateRequest | EpisodeUpdateRequest) => Promise<void>;
  isLoading?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const EpisodeFormModal: React.FC<EpisodeFormModalProps> = ({
  visible,
  mode,
  initialData,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const theme = useClinicTheme();
  const [isDirty, setIsDirty] = useState(false);

  // Reset dirty state when modal opens/closes (adjusted during render, not in an effect).
  const [syncedVisible, setSyncedVisible] = useState<boolean | null>(null);
  if (syncedVisible !== visible) {
    setSyncedVisible(visible);
    if (!visible) {
      setIsDirty(false);
    }
  }

  const handleClose = () => {
    if (isDirty && !isLoading) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setIsDirty(false);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const handleSubmit = async (data: EpisodeCreateRequest | EpisodeUpdateRequest) => {
    try {
      await onSubmit(data);
      setIsDirty(false);
      // Modal will be closed by parent component on success
    } catch (error) {
      // Error handling is done by parent component
      console.error('Form submission error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
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
            onPress={handleClose}
            disabled={isLoading}
          >
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            {mode === 'create' ? 'Create Episode' : 'Edit Episode'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Form */}
        <EpisodeForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isLoading={isLoading}
          mode={mode}
        />
      </SafeAreaView>
    </Modal>
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
});
