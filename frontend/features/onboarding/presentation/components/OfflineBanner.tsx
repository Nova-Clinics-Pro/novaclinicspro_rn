import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';

interface OfflineBannerProps {
  isOffline: boolean;
}

export function OfflineBanner({ isOffline }: OfflineBannerProps) {
  const theme = useClinicTheme();
  const { t } = useTranslation();

  if (!isOffline) {
    return null;
  }

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: theme.colors.feedback.warningLight,
        borderColor: theme.colors.feedback.warning,
        borderWidth: 1,
        borderRadius: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginHorizontal: theme.spacing.lg,
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
      }}
    >
      <Ionicons
        name="cloud-offline-outline"
        size={20}
        color={theme.colors.feedback.warning}
        style={{ marginRight: theme.spacing.sm }}
      />
      <View style={{ flex: 1 }}>
        <Text style={[theme.typography.body1, { color: theme.colors.text.primary }]}>
          {t('onboarding.progressiveExperience.offline.title')}
        </Text>
        <Text style={[theme.typography.body2, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
          {t('onboarding.progressiveExperience.offline.message')}
        </Text>
      </View>
    </View>
  );
}
