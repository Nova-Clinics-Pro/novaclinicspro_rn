/**
 * Prescription Share Modal Component
 * Modal for sharing signed prescriptions via SMS/WhatsApp/Email
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  ShareChannel,
  PrescriptionShareRequest,
  getChannelIcon,
  getChannelColor,
} from '../../data/models/prescriptions.dtos';

interface PrescriptionShareModalProps {
  visible: boolean;
  onClose: () => void;
  onShare: (request: PrescriptionShareRequest) => Promise<void>;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  isLoading?: boolean;
}

const CHANNELS: ShareChannel[] = ['SMS', 'WhatsApp', 'Email'];

export const PrescriptionShareModal: React.FC<PrescriptionShareModalProps> = ({
  visible,
  onClose,
  onShare,
  clientName,
  clientPhone,
  clientEmail,
  isLoading = false,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ShareChannel | null>(null);
  const [phone, setPhone] = useState(clientPhone || '');
  const [email, setEmail] = useState(clientEmail || '');
  const [customMessage, setCustomMessage] = useState('');

  const handleShare = async () => {
    if (!selectedChannel) {
      Alert.alert('Select Channel', 'Please select a sharing channel.');
      return;
    }

    if ((selectedChannel === 'SMS' || selectedChannel === 'WhatsApp') && !phone) {
      Alert.alert('Phone Required', 'Please enter a phone number.');
      return;
    }

    if (selectedChannel === 'Email' && !email) {
      Alert.alert('Email Required', 'Please enter an email address.');
      return;
    }

    const request: PrescriptionShareRequest = {
      channel: selectedChannel,
      recipient_phone: (selectedChannel === 'SMS' || selectedChannel === 'WhatsApp') ? phone : undefined,
      recipient_email: selectedChannel === 'Email' ? email : undefined,
      custom_message: customMessage || undefined,
    };

    await onShare(request);
  };

  const resetState = () => {
    setSelectedChannel(null);
    setPhone(clientPhone || '');
    setEmail(clientEmail || '');
    setCustomMessage('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Prescription</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {!!clientName && (
            <Text style={styles.clientName}>For: {clientName}</Text>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Channel Selection */}
            <Text style={styles.sectionLabel}>Select Channel</Text>
            <View style={styles.channelGrid}>
              {CHANNELS.map((channel) => {
                const isSelected = selectedChannel === channel;
                const channelColor = getChannelColor(channel);
                return (
                  <TouchableOpacity
                    key={channel}
                    style={[
                      styles.channelButton,
                      isSelected && { borderColor: channelColor, backgroundColor: channelColor + '10' },
                    ]}
                    onPress={() => setSelectedChannel(channel)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Ionicons
                      name={getChannelIcon(channel) as any}
                      size={28}
                      color={isSelected ? channelColor : colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.channelLabel,
                        isSelected && { color: channelColor },
                      ]}
                    >
                      {channel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Recipient Input */}
            {selectedChannel && (
              <View style={styles.inputSection}>
                {(selectedChannel === 'SMS' || selectedChannel === 'WhatsApp') && (
                  <>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+91 98765 43210"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      accessibilityLabel="Phone number"
                    />
                  </>
                )}

                {selectedChannel === 'Email' && (
                  <>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="patient@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      accessibilityLabel="Email address"
                    />
                  </>
                )}

                <Text style={styles.inputLabel}>Custom Message (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  placeholder="Add a personal message..."
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Custom message"
                />
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.shareButton,
                (!selectedChannel || isLoading) && styles.shareButtonDisabled,
              ]}
              onPress={handleShare}
              disabled={!selectedChannel || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.background.default} />
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color={colors.background.default} />
                  <Text style={styles.shareButtonText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    ...typography.h6,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  clientName: {
    ...typography.body2,
    color: colors.text.secondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  content: {
    padding: spacing.md,
  },
  sectionLabel: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  channelGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  channelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.background.paper,
  },
  channelLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  inputSection: {
    marginTop: spacing.sm,
  },
  inputLabel: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background.paper,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.grey[200],
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.text.primary,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary.main,
    gap: spacing.xs,
  },
  shareButtonDisabled: {
    backgroundColor: colors.grey[400],
  },
  shareButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
});
