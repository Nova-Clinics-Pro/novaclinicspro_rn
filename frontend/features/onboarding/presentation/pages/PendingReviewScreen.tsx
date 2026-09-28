import { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { logError } from '../../../../core/utils/errorHandler';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useRegistrationStatus } from '../../../registration/presentation/hooks/useRegistrationStatus';
import { NonWorkspaceActions } from '../components/NonWorkspaceActions';
import { useOnboardingStore } from '../providers/onboarding.store';

/** Displays only the genuine PENDING_REVIEW lifecycle state. */
export function PendingReviewScreen() {
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const { setCurrentApplicationId } = useOnboardingStore();
  const { currentUser, logout } = useAuth();
  const status = useRegistrationStatus(currentUser?.userId ?? '', { enabled: Boolean(currentUser?.userId) });

  useEffect(() => {
    if (applicationId) setCurrentApplicationId(applicationId);
  }, [applicationId, setCurrentApplicationId]);

  const refresh = useCallback(async () => {
    await status.refetch();
    router.replace('/');
  }, [router, status]);
  const signOut = useCallback(() => {
    void logout().catch(error => logError('application_status.pending_review.logout', error));
  }, [logout]);

  return (
    <ScrollView contentContainerStyle={styles.content} accessibilityRole="summary" accessibilityLabel={t('applicationStatus.pendingReview.accessibility')}>
      <View style={styles.icon}><Ionicons name="time-outline" size={theme.spacing.xxl * 2} color={theme.colors.feedback.warning} /></View>
      <Text style={styles.title}>{t('applicationStatus.pendingReview.title')}</Text>
      <Text style={styles.description}>{t('applicationStatus.pendingReview.description')}</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('applicationStatus.pendingReview.nextStepsTitle')}</Text>
        <Text style={styles.item}>{t('applicationStatus.pendingReview.submittedStep')}</Text>
        <Text style={styles.item}>{t('applicationStatus.pendingReview.reviewStep')}</Text>
        <Text style={styles.item}>{t('applicationStatus.pendingReview.setupStep')}</Text>
      </View>
      <NonWorkspaceActions
        onRefresh={() => void refresh().catch(error => logError('application_status.pending_review.refresh', error))}
        isRefreshing={status.isFetching}
        onSignOut={signOut}
      />
    </ScrollView>
  );
}

const createStyles = (theme: ClinicTheme) => StyleSheet.create({
  content: { flexGrow: 1, padding: theme.spacing.lg, backgroundColor: theme.colors.background.default },
  icon: { alignItems: 'center', marginTop: theme.spacing.xxl, marginBottom: theme.spacing.lg },
  title: { ...theme.typography.h3, color: theme.colors.text.primary, textAlign: 'center', marginBottom: theme.spacing.sm },
  description: { ...theme.typography.body1, color: theme.colors.text.secondary, textAlign: 'center', marginBottom: theme.spacing.xl },
  card: { gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.spacing.sm, backgroundColor: theme.colors.surface.default, marginBottom: theme.spacing.md },
  sectionTitle: { ...theme.typography.h6, color: theme.colors.text.primary },
  item: { ...theme.typography.body2, color: theme.colors.text.secondary },
});
