import { changeLanguage } from '../../../core/localization/i18n';
import { getDateLocale } from '../../../core/localization/dateLocale';
import { formatDayOfWeek, formatShortDate } from '../../../core/utils/dateTimeUtils';

afterEach(async () => { await changeLanguage('en-US'); });

describe('the language dates are written in', () => {
  it('keeps the Indian English format for English', () => {
    expect(getDateLocale()).toBe('en-IN');
  });

  it('follows the app language otherwise', async () => {
    await changeLanguage('hi-IN');
    expect(getDateLocale()).toBe('hi-IN');
  });

  it('writes weekday and month names in the app language', async () => {
    const monday = new Date(2047, 7, 12);   // 12 Aug 2047 is a Monday
    expect(formatDayOfWeek(monday)).toMatch(/Mon/i);
    expect(formatShortDate(monday)).toMatch(/Aug/);
    await changeLanguage('hi-IN');
    expect(formatDayOfWeek(monday)).toMatch(/[ऀ-ॿ]/);
    expect(formatShortDate(monday)).toMatch(/[ऀ-ॿ]/);
  });
});
