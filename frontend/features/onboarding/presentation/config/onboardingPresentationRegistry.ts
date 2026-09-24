import { Ionicons } from '@expo/vector-icons';
import { hasTranslation, t } from '../../../../core/localization/i18n';
import { logError } from '../../../../core/utils/errorHandler';

type OnboardingIcon = keyof typeof Ionicons.glyphMap;

const FALLBACK_ICON: OnboardingIcon = 'settings-outline';

/** Presentation-only mapping. Backend templates declare renderer keys, never glyph names. */
const ICONS_BY_RENDERER: Readonly<Record<string, OnboardingIcon>> = Object.freeze({
  clinic_profile: 'business-outline',
  operating_hours: 'time-outline',
  rooms: 'bed-outline',
  configured_clinical_services: 'medical-outline',
  treatments: 'medkit-outline',
  staff: 'people-outline',
  departments: 'git-network-outline',
  inventory: 'cube-outline',
  financials: 'calculator-outline',
  subscription_payment: 'card-outline',
  go_live_review: 'checkmark-circle-outline',
});

export const onboardingIconRendererKeys = Object.freeze(Object.keys(ICONS_BY_RENDERER));

export const resolveOnboardingIcon = (rendererKey: string | null | undefined): OnboardingIcon => {
  if (rendererKey && ICONS_BY_RENDERER[rendererKey]) {
    return ICONS_BY_RENDERER[rendererKey];
  }
  logError('onboarding.icon.unknown_renderer', new Error(rendererKey ?? 'missing_renderer_key'));
  return FALLBACK_ICON;
};

/** Keep unknown backend tokens out of UI while retaining centralized diagnostics. */
export const translateOnboardingToken = (
  token: string | null | undefined,
  fallbackToken = 'onboarding.renderers.unavailable',
  params?: Record<string, string | number>,
): string => {
  if (token && hasTranslation(token)) {
    return t(token, params);
  }
  if (token) {
    logError('onboarding.localization.unknown_token', new Error(token));
  }
  return t(fallbackToken, params);
};

export const translateOnboardingBlocker = (
  blockerToken: string | null | undefined,
  currentValue: unknown,
  requiredValue: unknown,
): string =>
  typeof currentValue === 'number' && Number.isFinite(currentValue) &&
  typeof requiredValue === 'number' && Number.isFinite(requiredValue)
    ? translateOnboardingToken('onboarding.requirements.progress', 'onboarding.renderers.unavailable', {
        current: currentValue,
        required: requiredValue,
      })
    : translateOnboardingToken(blockerToken);
