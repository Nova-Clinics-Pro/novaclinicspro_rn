import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';

interface NonWorkspaceActionsProps {
  readonly onSignOut: () => void;
  readonly onRefresh?: () => void;
  readonly isRefreshing?: boolean;
}

/** Shared exit/revalidation actions for authenticated users without a workspace. */
export function NonWorkspaceActions({ onSignOut, onRefresh, isRefreshing = false }: NonWorkspaceActionsProps) {
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {onRefresh ? (
        <TouchableOpacity
          testID="application-status-refresh"
          style={styles.primaryAction}
          onPress={onRefresh}
          disabled={isRefreshing}
          accessibilityRole="button"
          accessibilityLabel={t('applicationStatus.actions.refresh')}
        >
          {isRefreshing ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <Text style={styles.primaryText}>{t('applicationStatus.actions.refresh')}</Text>}
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        testID="application-status-sign-out"
        style={styles.secondaryAction}
        onPress={onSignOut}
        accessibilityRole="button"
        accessibilityLabel={t('applicationStatus.actions.signOut')}
      >
        <Text style={styles.secondaryText}>{t('applicationStatus.actions.signOut')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: { gap: theme.spacing.md, marginTop: theme.spacing.xl },
  primaryAction: { alignItems: 'center', borderRadius: theme.spacing.sm, padding: theme.spacing.md, backgroundColor: theme.colors.primary.default },
  primaryText: { ...theme.typography.button, color: theme.colors.text.onPrimary },
  secondaryAction: { alignItems: 'center', borderRadius: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border.default, padding: theme.spacing.md },
  secondaryText: { ...theme.typography.button, color: theme.colors.text.primary },
});
