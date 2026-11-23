/**
 * Invite to sign in
 * For a staff member who was added without a login: asks for an email and creates their sign-in (DEF_COP_008).
 * The server decides who may do this; the button is only shown for a staff member who cannot sign in yet.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { t } from '../../../../core/localization';
import { useInviteStaffToSignInMutation } from '../../data/repositories/staff.repository.impl';
import { inviteStaffErrorMessage } from '../../domain/inviteStaffErrorMessage';

interface StaffInviteActionProps {
  tenantId: string;
  staffId: string;
  hasLogin: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const StaffInviteAction: React.FC<StaffInviteActionProps> = ({ tenantId, staffId, hasLogin }) => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const invite = useInviteStaffToSignInMutation(tenantId, staffId);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setEmail('');
    setError(null);
  }, []);

  const send = useCallback(async () => {
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setError(t('clinicAdmin.staffInvite.emailInvalid'));
      return;
    }
    setError(null);
    try {
      await invite.mutateAsync(address);
      close();
      Alert.alert(t('clinicAdmin.staffInvite.sentTitle'), t('clinicAdmin.staffInvite.sentMessage', { email: address }));
    } catch (failure) {
      setError(inviteStaffErrorMessage(t, failure));
    }
  }, [email, invite, close]);

  if (hasLogin) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.openButton}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('clinicAdmin.staffInvite.open')}
        testID="staff-invite-open"
      >
        <Ionicons name="mail-outline" size={theme.sizes.iconSmall} color={theme.colors.primary.default} />
        <Text style={styles.openText}>{t('clinicAdmin.staffInvite.open')}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.title}>{t('clinicAdmin.staffInvite.title')}</Text>
            <Text style={styles.description}>{t('clinicAdmin.staffInvite.description')}</Text>
            <Text style={styles.label}>{t('clinicAdmin.staffInvite.emailLabel')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('clinicAdmin.staffInvite.emailPlaceholder')}
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={t('clinicAdmin.staffInvite.emailLabel')}
              testID="staff-invite-email"
            />
            {!!error && (
              <Text style={styles.error} accessibilityRole="alert" testID="staff-invite-error">
                {error}
              </Text>
            )}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancel} onPress={close} disabled={invite.isPending} testID="staff-invite-cancel">
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.send} onPress={send} disabled={invite.isPending} testID="staff-invite-send">
                <Text style={styles.sendText}>{t('clinicAdmin.staffInvite.send')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const makeStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    openButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: theme.spacing.xs,
      minHeight: theme.sizes.touchTarget,
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      borderRadius: theme.radii.medium,
      borderWidth: theme.borderWidths.default,
      borderColor: theme.colors.primary.default,
    },
    openText: { ...theme.typography.button, color: theme.colors.primary.default },
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface.overlay,
    },
    dialog: {
      width: theme.sizes.dialogWidth,
      maxWidth: theme.sizes.dialogMaxWidth,
      padding: theme.spacing.lg,
      borderRadius: theme.radii.large,
      backgroundColor: theme.colors.surface.elevated,
    },
    title: { ...theme.typography.h5, color: theme.colors.text.primary },
    description: { ...theme.typography.body2, color: theme.colors.text.secondary, marginTop: theme.spacing.xs },
    label: { ...theme.typography.caption, color: theme.colors.text.secondary, marginTop: theme.spacing.md },
    input: {
      ...theme.typography.body1,
      minHeight: theme.sizes.touchTarget,
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.medium,
      borderWidth: theme.borderWidths.default,
      borderColor: theme.colors.border.default,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background.default,
    },
    error: { ...theme.typography.body2, color: theme.colors.feedback.error, marginTop: theme.spacing.sm },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
    cancel: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.md },
    cancelText: { ...theme.typography.button, color: theme.colors.text.secondary },
    send: {
      minHeight: theme.sizes.touchTarget,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.medium,
      backgroundColor: theme.colors.primary.default,
    },
    sendText: { ...theme.typography.button, color: theme.colors.primary.onPrimary },
  });

export default StaffInviteAction;
