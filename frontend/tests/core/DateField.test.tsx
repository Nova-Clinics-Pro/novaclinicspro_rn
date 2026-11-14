import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { DateField, formatDateTyping, fromDateString, toDateString } from '../../core/components/DateField';

jest.mock('../../core/components/CrossPlatformDateTimePicker', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ value, maximumDate, onChange }: { value: Date; maximumDate?: Date; onChange: (e: { type: string }, d?: Date) => void }) => (
      <Text
        testID="picker"
        onPress={() => onChange({ type: 'set' }, new Date(1985, 2, 7))}
        accessibilityLabel={`${value.getFullYear()}|${maximumDate ? 'max' : 'nomax'}`}
      >picker</Text>
    ),
  };
});

describe('date helpers', () => {
  it('formats a date as the YYYY-MM-DD the forms store, in local time', () => {
    expect(toDateString(new Date(1985, 2, 7))).toBe('1985-03-07');
    expect(toDateString(new Date(2024, 11, 31, 23, 59))).toBe('2024-12-31');
  });

  it('accepts only complete, real calendar dates', () => {
    expect(fromDateString('1985-03-07')?.getMonth()).toBe(2);
    expect(fromDateString('1985-02-30')).toBeNull();
    expect(fromDateString('1985-3-7')).toBeNull();
    expect(fromDateString('')).toBeNull();
  });

  it('inserts the dashes while typing', () => {
    expect(formatDateTyping('19850307')).toBe('1985-03-07');
    expect(formatDateTyping('198503')).toBe('1985-03');
    expect(formatDateTyping('1985-03-07-99')).toBe('1985-03-07');
    expect(formatDateTyping('ab12')).toBe('12');
  });
});

describe('DateField on a phone', () => {
  beforeEach(() => { (Platform as { OS: string }).OS = 'android'; });
  afterAll(() => { (Platform as { OS: string }).OS = 'ios'; });

  it('still lets the user type the date', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<DateField value="" onChange={onChange} testID="dob" />);
    fireEvent.changeText(getByTestId('dob'), '19850307');
    expect(onChange).toHaveBeenCalledWith('1985-03-07');
  });

  it('opens the calendar from the icon and writes the chosen date', () => {
    const onChange = jest.fn();
    const { getByTestId, queryByTestId } = render(<DateField value="" onChange={onChange} testID="dob" maximumDate={new Date()} />);
    expect(queryByTestId('picker')).toBeNull();
    fireEvent.press(getByTestId('dob-calendar'));
    expect(getByTestId('picker').props.accessibilityLabel).toContain('|max');
    fireEvent.press(getByTestId('picker'));
    expect(onChange).toHaveBeenCalledWith('1985-03-07');
    expect(queryByTestId('picker')).toBeNull(); // Android closes after choosing
  });

  it('starts the calendar on the current value', () => {
    const { getByTestId } = render(<DateField value="1990-06-15" onChange={jest.fn()} testID="dob" />);
    fireEvent.press(getByTestId('dob-calendar'));
    expect(getByTestId('picker').props.accessibilityLabel).toMatch(/^1990\|/);
  });
});

describe('DateField on the web', () => {
  beforeEach(() => { (Platform as { OS: string }).OS = 'web'; });
  afterAll(() => { (Platform as { OS: string }).OS = 'ios'; });

  it('renders the browser date control with the limits and reports changes', () => {
    const onChange = jest.fn();
    const max = new Date(2026, 10, 14);
    const { UNSAFE_getByType } = render(<DateField value="1985-03-07" onChange={onChange} maximumDate={max} testID="dob" />);
    const input = UNSAFE_getByType('input' as never);
    expect(input.props.type).toBe('date');
    expect(input.props.value).toBe('1985-03-07');
    expect(input.props.max).toBe('2026-11-14');
    input.props.onChange({ target: { value: '1986-01-02' } });
    expect(onChange).toHaveBeenCalledWith('1986-01-02');
  });
});

describe('DateField options', () => {
  afterAll(() => { (Platform as { OS: string }).OS = 'ios'; });

  it('a disabled field cannot be edited and does not open the calendar (phone)', () => {
    (Platform as { OS: string }).OS = 'android';
    const { getByTestId, queryByTestId } = render(<DateField value="2026-11-14" onChange={jest.fn()} disabled testID="due" />);
    expect(getByTestId('due').props.editable).toBe(false);
    fireEvent.press(getByTestId('due-calendar'));
    expect(queryByTestId('picker')).toBeNull();
  });

  it('a disabled field is a disabled browser control (web)', () => {
    (Platform as { OS: string }).OS = 'web';
    const { UNSAFE_getByType } = render(<DateField value="2026-11-14" onChange={jest.fn()} disabled />);
    expect(UNSAFE_getByType('input' as never).props.disabled).toBe(true);
  });

  it('an invalid field gets the error border on both platforms', () => {
    for (const os of ['android', 'web']) {
      (Platform as { OS: string }).OS = os;
      const { toJSON } = render(<DateField value="" onChange={jest.fn()} error />);
      expect(JSON.stringify(toJSON())).toContain('borderColor');
    }
  });

  it('the iOS calendar stays open until the user confirms with OK', () => {
    (Platform as { OS: string }).OS = 'ios';
    const onChange = jest.fn();
    const { getByTestId, getByText, queryByTestId } = render(<DateField value="" onChange={onChange} testID="d" />);
    fireEvent.press(getByTestId('d-calendar'));
    fireEvent.press(getByTestId('picker'));
    expect(onChange).toHaveBeenCalledWith('1985-03-07');
    expect(queryByTestId('picker')).not.toBeNull();
    fireEvent.press(getByText('OK'));
    expect(queryByTestId('picker')).toBeNull();
  });
});
