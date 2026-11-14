import React, { type ComponentProps } from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import NativeDateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

export type { DateTimePickerEvent };

type PickerMode = 'date' | 'time';

interface CrossPlatformDateTimePickerProps {
  value: Date;
  mode: PickerMode;
  display?: ComponentProps<typeof NativeDateTimePicker>['display'];
  minimumDate?: Date;
  maximumDate?: Date;
  minuteInterval?: number;
  onChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  style?: ViewStyle;
}

const pad = (value: number) => String(value).padStart(2, '0');

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toTimeInputValue = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const parseDateInputValue = (inputValue: string, currentValue: Date) => {
  const [year, month, day] = inputValue.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(
    year,
    month - 1,
    day,
    currentValue.getHours(),
    currentValue.getMinutes(),
    currentValue.getSeconds(),
    currentValue.getMilliseconds(),
  );
};

const parseTimeInputValue = (inputValue: string, currentValue: Date) => {
  const parts = inputValue.split(':');
  if (parts.length < 2 || parts.some(part => part.trim() === '')) return null;
  const [hours, minutes] = parts.map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const nextValue = new Date(currentValue);
  nextValue.setHours(hours, minutes, 0, 0);
  return nextValue;
};

const createSetEvent = () => ({ type: 'set' }) as DateTimePickerEvent;

const CrossPlatformDateTimePicker: React.FC<CrossPlatformDateTimePickerProps> = ({
  value,
  mode,
  minimumDate,
  maximumDate,
  minuteInterval,
  onChange,
  style,
  display,
  ...nativeProps
}) => {
  if (Platform.OS !== 'web') {
    return (
      <NativeDateTimePicker
        value={value}
        mode={mode}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        minuteInterval={minuteInterval}
        onChange={onChange}
        display={display as never}
        {...nativeProps}
      />
    );
  }

  const inputValue = mode === 'date' ? toDateInputValue(value) : toTimeInputValue(value);
  const minimumValue = minimumDate && mode === 'date' ? toDateInputValue(minimumDate) : undefined;
  const maximumValue = maximumDate && mode === 'date' ? toDateInputValue(maximumDate) : undefined;
  const step = mode === 'time' && minuteInterval ? minuteInterval * 60 : undefined;

  // react-native-web's TextInput forces type="text", so render a real DOM input to get the
  // browser's own date/time controls.
  return React.createElement('input', {
    type: mode,
    value: inputValue,
    min: minimumValue,
    max: maximumValue,
    step,
    style: { ...webInputStyle, ...(StyleSheet.flatten(style) as object) },
    onChange: (event: { target: { value: string } }) => {
      const nextInputValue = event.target.value;
      const nextValue =
        mode === 'date'
          ? parseDateInputValue(nextInputValue, value)
          : parseTimeInputValue(nextInputValue, value);

      if (nextValue) {
        onChange(createSetEvent(), nextValue);
      }
    },
  });
};

// A real DOM <input> takes CSS (not React Native) style values.
const webInputStyle = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 44,
  border: '1px solid #D1D5DB',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 16,
  color: '#111827',
  backgroundColor: '#FFFFFF',
} as const;

export default CrossPlatformDateTimePicker;
