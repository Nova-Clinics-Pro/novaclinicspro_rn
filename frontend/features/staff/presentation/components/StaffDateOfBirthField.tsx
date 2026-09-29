import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CrossPlatformDateTimePicker from '../../../../core/components/CrossPlatformDateTimePicker';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';

interface StaffDateOfBirthFieldProps {
  readonly value: string | null | undefined;
  readonly onChange: (value: string) => void;
}

const parseCanonicalDate = (value: string | null | undefined): Date => {
  const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toCanonicalDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Reuses the app-owned date picker and keeps staff transport in canonical ISO date form. */
export const StaffDateOfBirthField = ({ value, onChange }: StaffDateOfBirthFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selectedDate = useMemo(() => parseCanonicalDate(value), [value]);

  return (
    <View>
      <Text style={styles.label}>{t('onboarding.progressiveExperience.staff.dateOfBirth.label')}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.progressiveExperience.staff.dateOfBirth.label')}
        onPress={() => setIsOpen(true)}
        style={styles.trigger}
      >
        <Text style={value ? styles.value : styles.placeholder}>{value || t('onboarding.progressiveExperience.staff.dateOfBirth.placeholder')}</Text>
      </TouchableOpacity>
      {isOpen ? (
        <CrossPlatformDateTimePicker
          value={selectedDate}
          mode="date"
          onChange={(event, nextDate) => {
            setIsOpen(false);
            if (event.type === 'set' && nextDate) onChange(toCanonicalDate(nextDate));
          }}
        />
      ) : null}
    </View>
  );
};

const createStyles = (theme: ClinicTheme) => StyleSheet.create({
  label: { ...theme.typography.body2, color: theme.colors.text.primary, marginBottom: theme.spacing.xs },
  trigger: { borderColor: theme.colors.border.default, borderRadius: theme.spacing.xs, borderWidth: 1, minHeight: theme.spacing.xxl, justifyContent: 'center', paddingHorizontal: theme.spacing.md },
  value: { ...theme.typography.body2, color: theme.colors.text.primary },
  placeholder: { ...theme.typography.body2, color: theme.colors.text.secondary },
});
