import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';

export const InvalidWorkspaceState: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background.default }]}>
      <View style={[styles.center, { padding: spacing.md, gap: spacing.md }]}>
        <Text style={[typography.h6, { color: colors.text.primary }]}>
          {t('visitCommandCenter.invalidContext.title')}
        </Text>
        <Text style={[typography.body2, { color: colors.text.secondary, textAlign: 'center' }]}>
          {t('visitCommandCenter.invalidContext.message')}
        </Text>
        <TouchableOpacity onPress={onBack} accessibilityRole="button">
          <Text style={[typography.button, { color: colors.primary.default }]}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
