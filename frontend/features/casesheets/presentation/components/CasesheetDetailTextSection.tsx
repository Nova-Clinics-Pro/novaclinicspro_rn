import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

export interface CasesheetDetailTextSectionProps {
  title: string;
  text?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Read-only text display; the screen owns clinical field selection and order. */
export const CasesheetDetailTextSection: React.FC<CasesheetDetailTextSectionProps> = ({
  title,
  text,
  icon,
}) => {
  if (!text) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={colors.primary.main} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionContent}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.body1,
    color: colors.primary.main,
    fontWeight: '600',
  },
  sectionContent: {
    ...typography.body1,
    color: colors.text.primary,
    lineHeight: 22,
  },
});
