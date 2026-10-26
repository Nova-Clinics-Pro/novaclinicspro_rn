import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import enUS from '../../../core/localization/translations/en-US.json';
import hiIN from '../../../core/localization/translations/hi-IN.json';
import {
  changeLanguage,
  getCurrentLocale,
  hasTranslation,
  initI18n,
  SUPPORTED_LOCALES,
  t,
  type LocaleCode,
} from '../../../core/localization/i18n';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => []) }));

const flatten = (value: unknown, prefix = ''): Record<string, string> => {
  if (typeof value === 'string') return { [prefix]: value };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Non-string translation leaf: ${prefix}`);
  }
  return Object.entries(value).reduce<Record<string, string>>(
    (result, [key, child]) => ({
      ...result,
      ...flatten(child, prefix ? `${prefix}.${key}` : key),
    }),
    {},
  );
};

const placeholders = (value: string) =>
  [...value.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1]).sort();

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (Localization.getLocales as jest.Mock).mockReturnValue([]);
  await changeLanguage('en-US');
});

afterEach(async () => {
  await changeLanguage('en-US');
  jest.restoreAllMocks();
});

describe('Package D catalog and interpolation contract', () => {
  it('keeps complete English/Hindi key and placeholder parity with nonempty copy', () => {
    const english = flatten(enUS);
    const hindi = flatten(hiIN);
    expect(Object.keys(hindi).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english)) {
      expect(english[key].trim()).not.toBe('');
      expect(hindi[key].trim()).not.toBe('');
      expect(placeholders(hindi[key])).toEqual(placeholders(english[key]));
    }
  });

  it('interpolates restored Hindi session-count and visit-number copy', async () => {
    await changeLanguage('hi-IN');
    expect(t('appointments.worksForSessions', { count: 2, total: 3 })).toBe('2/3 सत्रों के लिए उपलब्ध');
    expect(t('episodeWorkspace.header.visitNumber', { number: 4 })).toBe('विज़िट 4');
    expect(hasTranslation('completeConsultation.reasonCodes.episode_closed')).toBe(true);
    expect(t('completeConsultation.reasonCodes.episode_closed')).toBe('एपिसोड बंद है');
  });

  it('preserves placeholders when interpolation values are absent', async () => {
    await changeLanguage('hi-IN');
    expect(t('appointments.worksForSessions')).toContain('{{count}}/{{total}}');
  });
});

describe('Package D existing locale and fallback contract', () => {
  it('retains all configured choices without claiming additional catalogs', () => {
    expect(SUPPORTED_LOCALES.map(({ code }) => code)).toEqual([
      'en-US', 'en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN',
    ]);
  });

  it.each(['en-US', 'en-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN'] as LocaleCode[])(
    'retains English fallback behavior for %s',
    async (locale) => {
      await changeLanguage(locale);
      expect(getCurrentLocale()).toBe(locale);
      expect(t('appointments.worksForSessions', { count: 2, total: 3 })).toBe('Works for 2/3 sessions');
      expect(t('common.consultation')).toBe('Consultation');
    },
  );

  it('restores a configured fallback preference without changing its identity', async () => {
    await AsyncStorage.setItem('@app_locale', 'ta-IN');
    await initI18n();
    expect(getCurrentLocale()).toBe('ta-IN');
    expect(t('common.consultation')).toBe('Consultation');
  });

  it('selects Hindi by device language when no preference is stored', async () => {
    await AsyncStorage.removeItem('@app_locale');
    (Localization.getLocales as jest.Mock).mockReturnValue([{ languageTag: 'hi-GB' }]);
    await initI18n();
    expect(getCurrentLocale()).toBe('hi-IN');
    expect(t('common.consultation')).toBe(hiIN.common.consultation);
  });

  it('rejects an unknown locale without changing current locale', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await changeLanguage('xx-XX' as LocaleCode);
    expect(getCurrentLocale()).toBe('en-US');
    expect(warning).toHaveBeenCalledWith('Invalid locale: xx-XX');
  });

  it('keeps an unknown key visible rather than fabricating translated copy', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await changeLanguage('hi-IN');
    expect(t('packageD.unknownKey')).toBe('packageD.unknownKey');
    expect(hasTranslation('packageD.unknownKey')).toBe(false);
    expect(warning).toHaveBeenCalledWith('Missing translation: packageD.unknownKey');
  });
});
