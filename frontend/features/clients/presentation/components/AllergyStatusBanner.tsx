/**
 * One line that says where a patient's allergies stand, for screens where a clinician is about to act (a prescription). It never shows an
 * empty list as a good sign: "not recorded" is its own, visible state.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { t } from '../../../../core/localization';
import { activeAllergies, type ClientAllergies } from '../../domain/clientAllergies';

export const AllergyStatusBanner: React.FC<{ allergies: ClientAllergies | undefined; testID?: string }> = ({ allergies, testID = 'allergy-banner' }) => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (!allergies) return null;
  const active = activeAllergies(allergies.items);
  const hasAllergies = allergies.status === 'has_allergies' && active.length > 0;
  const tone = hasAllergies ? styles.danger : allergies.status === 'none_known' ? styles.calm : styles.notice;
  const icon = hasAllergies ? 'warning' : allergies.status === 'none_known' ? 'checkmark-circle-outline' : 'help-circle-outline';
  const color = hasAllergies ? theme.colors.feedback.error : allergies.status === 'none_known' ? theme.colors.feedback.success : theme.colors.feedback.warning;
  return (
    <View style={[styles.box, tone]} testID={testID} accessible accessibilityRole="text">
      <Ionicons name={icon} size={20} color={color} />
      <View style={styles.text}>
        <Text style={styles.title} testID={`${testID}-status`}>
          {hasAllergies
            ? `${t('clientAllergies.status.has_allergies')}: ${active.map((a) => a.substance).join(', ')}`
            : t(`clientAllergies.status.${allergies.status === 'has_allergies' ? 'unknown' : allergies.status}`)}
        </Text>
        {allergies.status === 'unknown' ? <Text style={styles.hint}>{t('clientAllergies.unknownHint')}</Text> : null}
      </View>
    </View>
  );
};

const makeStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    box: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radii.medium, borderWidth: theme.borderWidths.default },
    danger: { borderColor: theme.colors.feedback.error, backgroundColor: theme.colors.background.elevated },
    calm: { borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.background.elevated },
    notice: { borderColor: theme.colors.feedback.warning, backgroundColor: theme.colors.background.elevated },
    text: { flex: 1, gap: theme.spacing.xs },
    title: { ...theme.typography.subtitle2, color: theme.colors.text.primary },
    hint: { ...theme.typography.caption, color: theme.colors.text.secondary },
  });
