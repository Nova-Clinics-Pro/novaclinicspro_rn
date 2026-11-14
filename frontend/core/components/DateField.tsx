import React, { useState } from 'react';
import { Platform, StyleProp, StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import CrossPlatformDateTimePicker from './CrossPlatformDateTimePicker';

const pad = (n: number) => String(n).padStart(2, '0');

/** A Date as the `YYYY-MM-DD` string forms store. */
export const toDateString = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** `YYYY-MM-DD` to a Date at local midnight, or null when it is not a complete, real calendar date. */
export const fromDateString = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

/** Typing helper: digits only, dashes inserted as the user types (20240131 -> 2024-01-31). */
export const formatDateTyping = (text: string): string => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

interface DateFieldProps {
  /** `YYYY-MM-DD`, or empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Latest selectable date (for a date of birth: today). */
  maximumDate?: Date;
  minimumDate?: Date;
  accessibilityLabel?: string;
  testID?: string;
  /** Not editable and no calendar (e.g. a date that is fixed once an invoice exists). */
  disabled?: boolean;
  /** Draws the field with the error border. */
  error?: boolean;
  /** Layout of the whole control inside its row/column (for example `{ flex: 1 }`). */
  style?: StyleProp<ViewStyle>;
  /** Overrides for the bordered box (background, radius, padding ...). */
  boxStyle?: StyleProp<ViewStyle>;
}

/**
 * A date input with a working calendar on every platform.
 *
 * - Web: the browser's own date control (calendar popup, keyboard entry, min/max).
 * - iOS / Android: type the date, or tap the calendar icon for the system picker.
 * The value is always the `YYYY-MM-DD` string the forms already store.
 */
export const DateField: React.FC<DateFieldProps> = ({
  value, onChange, onBlur, placeholder = 'YYYY-MM-DD', maximumDate, minimumDate, accessibilityLabel, testID,
  disabled = false, error = false, style, boxStyle,
}) => {
  const box = [styles.wrapper, error && styles.error, disabled && styles.disabled, boxStyle];
  const [picking, setPicking] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={[box, style]}>
        {React.createElement('input', {
          type: 'date',
          value,
          disabled,
          min: minimumDate ? toDateString(minimumDate) : undefined,
          max: maximumDate ? toDateString(maximumDate) : undefined,
          'aria-label': accessibilityLabel ?? placeholder,
          'data-testid': testID,
          style: webInputStyle,
          onChange: (event: { target: { value: string } }) => onChange(event.target.value),
          onBlur,
        })}
      </View>
    );
  }

  const selected = fromDateString(value) ?? maximumDate ?? new Date();
  return (
    <View style={style}>
      <View style={box}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? placeholder}
          disabled={disabled}
          onPress={() => setPicking(open => !open)}
          testID={testID ? `${testID}-calendar` : undefined}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={text => onChange(formatDateTyping(text))}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          keyboardType="numeric"
          maxLength={10}
          editable={!disabled}
          testID={testID}
        />
      </View>
      {picking && !disabled ? (
        <View>
          <CrossPlatformDateTimePicker
            value={selected}
            mode="date"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={(event, date) => {
              if (Platform.OS === 'android') setPicking(false);
              if (event.type !== 'dismissed' && date) onChange(toDateString(date));
            }}
          />
          {Platform.OS === 'ios' ? (
            <TouchableOpacity accessibilityRole="button" onPress={() => setPicking(false)} style={styles.done}>
              <Text style={styles.doneText}>OK</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  error: { borderColor: colors.error.main },
  disabled: { opacity: 0.6 },
  input: { flex: 1, paddingVertical: spacing.md, ...typography.body1, color: colors.text.primary },
  done: { alignSelf: 'flex-end', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  doneText: { ...typography.button, color: colors.primary.main },
});

// A real DOM <input> takes CSS (not React Native) style values.
const webInputStyle = {
  flex: 1,
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 56,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: 16,
  color: '#111827',
} as const;
