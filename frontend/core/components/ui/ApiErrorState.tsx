import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { classifyApiError } from '../../api/apiErrorPresentation';
import { describeApiError } from '../../localization/apiErrorMessages';
import { useTranslation } from '../../localization/useTranslation';
import { useClinicTheme } from '../../theme/useClinicTheme';
import { useAuthStore } from '../../../features/auth/presentation/providers/auth.store';
import { ThemedButton } from './ThemedButton';

/** Role codes to name in the message: the session's roles, plus owner when the user owns a clinic. */
const sessionRoleCodes = (session: { roles: string[]; ownedClinics: unknown[] }): string[] =>
  session.ownedClinics.length > 0 && !session.roles.includes('clinic_owner')
    ? ['clinic_owner', ...session.roles]
    : [...session.roles];

interface ApiErrorStateProps {
  readonly error: unknown;
  /** Called by the Retry button. Retry is offered only when trying again can help (network/server). */
  readonly onRetry?: () => void;
}

/**
 * Full-area failure state for a screen whose data could not be loaded.
 *
 * - A permission or plan problem is explained in the user's language ("As a clinic owner you don't
 *   have permission to ... Only doctors and receptionists can do this.") and offers a way forward
 *   (back / dashboard), never Retry.
 * - A network or server problem offers Retry.
 * It never shows transport text such as "Request failed with status code 403".
 */
export function ApiErrorState({ error, onRetry }: ApiErrorStateProps) {
  const theme = useClinicTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const currentUser = useAuthStore(state => state.currentUser);
  const roles = currentUser ? sessionRoleCodes(currentUser) : [];

  const info = classifyApiError(error);
  const { title, message } = describeApiError(t, info, roles);
  const canGoBack = router.canGoBack?.() ?? false;
  const denied = info.kind === 'permission_denied' || info.kind === 'entitlement_required';

  return (
    <View
      accessibilityRole="alert"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}
    >
      <Ionicons
        name={denied ? 'lock-closed-outline' : 'alert-circle'}
        size={56}
        color={denied ? theme.colors.text.secondary : theme.colors.feedback.error}
      />
      <Text style={{ ...theme.typography.h3, color: theme.colors.text.primary, textAlign: 'center' }}>{title}</Text>
      <Text style={{ ...theme.typography.body1, color: theme.colors.text.secondary, textAlign: 'center' }}>{message}</Text>
      <View style={{ gap: theme.spacing.sm, alignSelf: 'stretch', alignItems: 'center' }}>
        {info.retryable && onRetry ? <ThemedButton label={t('common.retry')} onPress={onRetry} /> : null}
        {/* One way out, not two: back to where the user came from, or the dashboard when there is nowhere to go back to. */}
        {canGoBack ? (
          <ThemedButton
            label={t('errors.permissionDenied.goBack')}
            variant={info.retryable && onRetry ? 'outline' : 'primary'}
            onPress={() => router.back()}
          />
        ) : (
          <ThemedButton
            label={t('errors.permissionDenied.backToDashboard')}
            variant={info.retryable && onRetry ? 'outline' : 'primary'}
            onPress={() => router.replace('/')}
          />
        )}
      </View>
    </View>
  );
}
