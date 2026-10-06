import React, { type ComponentProps } from 'react';
import { Platform, StyleSheet, TextInput, ViewStyle } from 'react-native';
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
  const [hours, minutes] = inputValue.split(':').map(Number);
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
        minuteInterval={minuteInterval}
        onChange={onChange}
        display={display as never}
        {...nativeProps}
      />
    );
  }

  const inputValue = mode === 'date' ? toDateInputValue(value) : toTimeInputValue(value);
  const minimumValue = minimumDate && mode === 'date' ? toDateInputValue(minimumDate) : undefined;
  const step = mode === 'time' && minuteInterval ? minuteInterval * 60 : undefined;

  return (
    <TextInput
      value={inputValue}
      onChangeText={(nextInputValue) => {
        const nextValue =
          mode === 'date'
            ? parseDateInputValue(nextInputValue, value)
            : parseTimeInputValue(nextInputValue, value);

        if (nextValue) {
          onChange(createSetEvent(), nextValue);
        }
      }}
      style={[styles.webInput, style]}
      {...({ type: mode, min: minimumValue, step } as any)}
    />
  );
};

const styles = StyleSheet.create({
  webInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
});

export default CrossPlatformDateTimePicker;
