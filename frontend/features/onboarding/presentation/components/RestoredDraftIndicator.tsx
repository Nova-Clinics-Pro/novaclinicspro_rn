import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';

export function RestoredDraftIndicator() {
  const theme = useClinicTheme();
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="text"
      style={{
        backgroundColor: theme.colors.feedback.infoLight,
        borderColor: theme.colors.feedback.info,
        borderWidth: 1,
        borderRadius: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.md,
      }}
    >
      <Ionicons
        name="information-circle"
        size={18}
        color={theme.colors.feedback.info}
        style={{ marginRight: theme.spacing.sm }}
      />
      <Text style={[theme.typography.body2, { color: theme.colors.text.primary, flex: 1 }]}>
        {t('onboarding.progressiveExperience.drafts.restored')}
      </Text>
    </View>
  );
}
