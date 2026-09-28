import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { logError } from '../../../../core/utils/errorHandler';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { NonWorkspaceActions } from '../components/NonWorkspaceActions';

/** A terminal rejected state has no supported self-service resubmission path. */
export function RejectedScreen() {
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { logout } = useAuth();

  const signOut = useCallback(() => {
    void logout().catch(error => logError('application_status.rejected.logout', error));
  }, [logout]);

  return (
    <ScrollView contentContainerStyle={styles.content} accessibilityRole="summary" accessibilityLabel={t('applicationStatus.rejected.accessibility')}>
      <View style={styles.icon}>
        <Ionicons name="close-circle-outline" size={theme.spacing.xxl * 2} color={theme.colors.feedback.error} />
      </View>
      <Text style={styles.title}>{t('applicationStatus.rejected.title')}</Text>
      <Text style={styles.description}>{t('applicationStatus.rejected.description')}</Text>
      <View style={styles.card}>
        <Text style={styles.detail}>{t('applicationStatus.rejected.detail')}</Text>
      </View>
      <NonWorkspaceActions onSignOut={signOut} />
    </ScrollView>
  );
}

const createStyles = (theme: ClinicTheme) => StyleSheet.create({
  content: { flexGrow: 1, padding: theme.spacing.lg, justifyContent: 'center', backgroundColor: theme.colors.background.default },
  icon: { alignItems: 'center', marginBottom: theme.spacing.lg },
  title: { ...theme.typography.h3, color: theme.colors.text.primary, textAlign: 'center', marginBottom: theme.spacing.sm },
  description: { ...theme.typography.body1, color: theme.colors.text.secondary, textAlign: 'center' },
  card: { marginTop: theme.spacing.xl, borderRadius: theme.spacing.sm, padding: theme.spacing.lg, backgroundColor: theme.colors.surface.default },
  detail: { ...theme.typography.body2, color: theme.colors.text.secondary, textAlign: 'center' },
});
