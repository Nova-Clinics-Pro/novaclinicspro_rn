import { getCurrentLocale } from './i18n';

/** The locale dates are written in: the app's language, with English keeping the Indian format (12 Aug 2047). */
export const getDateLocale = (): string => {
  const locale = getCurrentLocale();
  return locale.toLowerCase().startsWith('en') ? 'en-IN' : locale;
};
