import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';

/** Shown instead of a clinical authoring form to a user who may not author that document (Doctor only). */
export const NoAuthoringAccessState: React.FC<{ document: 'casesheet' | 'prescription'; onBack: () => void }> = ({
  document,
  onBack,
}) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background.default }]}>
      <View style={[styles.center, { padding: spacing.md, gap: spacing.md }]}>
        <Text style={[typography.body1, { color: colors.text.primary, textAlign: 'center' }]}>
          {t(`visitCommandCenter.noAuthoringAccess.${document}`)}
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
