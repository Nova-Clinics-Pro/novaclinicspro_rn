/**
 * useTranslation Hook
 * 
 * React hook for accessing translations in components.
 * Provides the t() function and current locale information.
 * 
 * Usage:
 * const { t, locale, changeLocale } = useTranslation();
 * const message = t('errors.network.generic');
 */

import { useState, useCallback } from 'react';
import { t as translate, changeLanguage, getCurrentLocale, LocaleCode, SUPPORTED_LOCALES } from './i18n';

interface UseTranslationReturn {
  /**
   * Translation function
   * @param key - Dot-notation translation key
   * @param params - Optional interpolation parameters
   */
  t: (key: string, params?: Record<string, string | number>) => string;
  
  /**
   * Current locale code
   */
  locale: LocaleCode;
  
  /**
   * Change the current locale
   */
  changeLocale: (locale: LocaleCode) => Promise<void>;
  
  /**
   * List of supported locales
   */
  supportedLocales: typeof SUPPORTED_LOCALES;
}

export const useTranslation = (): UseTranslationReturn => {
  const [locale, setLocale] = useState<LocaleCode>(getCurrentLocale());
  const [, forceUpdate] = useState({});

  const changeLocale = useCallback(async (newLocale: LocaleCode) => {
    await changeLanguage(newLocale);
    setLocale(newLocale);
    // Force re-render to update all translations
    forceUpdate({});
  }, []);

  // Wrap translate function to trigger re-renders on locale change
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(key, params);
    },
    [locale] // Re-create when locale changes
  );

  return {
    t,
    locale,
    changeLocale,
    supportedLocales: SUPPORTED_LOCALES,
  };
};

export default useTranslation;
