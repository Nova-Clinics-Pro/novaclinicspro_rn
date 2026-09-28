import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import type { RegistrationSubmissionError } from '../../data/datasources/registration.api';

interface RegistrationErrorNoticeProps {
  readonly error: RegistrationSubmissionError;
  readonly onSignIn: () => void;
}

/** Feature-owned presentation for expected registration failures. */
export function RegistrationErrorNotice({ error, onSignIn }: RegistrationErrorNoticeProps) {
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.message}>{t(`errors.auth.registration.${error.kind}`)}</Text>
      {error.kind === 'USER_ALREADY_EXISTS' ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('errors.auth.registration.signIn')}
          onPress={onSignIn}
        >
          <Text style={styles.signInAction}>{t('errors.auth.registration.signIn')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.sm,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.feedback.errorLight,
    },
    message: {
      ...theme.typography.body2,
      color: theme.colors.feedback.error,
    },
    signInAction: {
      ...theme.typography.button,
      color: theme.colors.primary.default,
    },
  });
