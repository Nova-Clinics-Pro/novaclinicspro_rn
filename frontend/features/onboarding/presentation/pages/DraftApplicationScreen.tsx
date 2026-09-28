import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { logError } from '../../../../core/utils/errorHandler';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useRegistrationStatus } from '../../../registration/presentation/hooks/useRegistrationStatus';
import { NonWorkspaceActions } from '../components/NonWorkspaceActions';

/**
 * A DRAFT application has not reached review. It intentionally offers no
 * fabricated editor: current product routing has no supported edit/resume flow.
 */
export function DraftApplicationScreen() {
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const status = useRegistrationStatus(currentUser?.userId ?? '', { enabled: Boolean(currentUser?.userId) });

  const refresh = useCallback(async () => {
    await status.refetch();
    router.replace('/');
  }, [router, status]);
  const signOut = useCallback(() => {
    void logout().catch(error => logError('application_status.draft.logout', error));
  }, [logout]);

  return (
    <ScrollView contentContainerStyle={styles.content} accessibilityRole="summary" accessibilityLabel={t('applicationStatus.draft.accessibility')}>
      <View style={styles.icon}><Ionicons name="alert-circle-outline" size={theme.spacing.xxl * 2} color={theme.colors.feedback.warning} /></View>
      <Text style={styles.title}>{t('applicationStatus.draft.title')}</Text>
      <Text style={styles.description}>{t('applicationStatus.draft.description')}</Text>
      <View style={styles.card}><Text style={styles.detail}>{t('applicationStatus.draft.detail')}</Text></View>
      <NonWorkspaceActions
        onRefresh={() => void refresh().catch(error => logError('application_status.draft.refresh', error))}
        isRefreshing={status.isFetching}
        onSignOut={signOut}
      />
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
