import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DateField } from '../../../../core/components/DateField';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';

interface StaffDateOfBirthFieldProps {
  readonly value: string | null | undefined;
  readonly onChange: (value: string) => void;
}

/** Date of birth for a staff member: the shared date field (calendar on web and phones), never in the future, stored as YYYY-MM-DD. */
export const StaffDateOfBirthField = ({ value, onChange }: StaffDateOfBirthFieldProps) => {
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const label = t('onboarding.progressiveExperience.staff.dateOfBirth.label');

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <DateField
        value={value ?? ''}
        onChange={onChange}
        placeholder={t('onboarding.progressiveExperience.staff.dateOfBirth.placeholder')}
        maximumDate={new Date()}
        accessibilityLabel={label}
        testID="staff-date-of-birth"
      />
    </View>
  );
};

const createStyles = (theme: ClinicTheme) => StyleSheet.create({
  label: { ...theme.typography.body2, color: theme.colors.text.primary, marginBottom: theme.spacing.xs },
});
