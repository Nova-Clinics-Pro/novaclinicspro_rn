import enUS from '../../core/localization/translations/en-US.json';
import hiIN from '../../core/localization/translations/hi-IN.json';

describe('Commercial Retention localization', () => {
  it('keeps en-US and hi-IN key parity for the complete presentation contract', () => {
    const english = enUS.onboarding.progressiveExperience.commercialRetention;
    const hindi = hiIN.onboarding.progressiveExperience.commercialRetention;

    const keys = (value: unknown, prefix = ''): string[] => {
      if (!value || typeof value !== 'object') return [prefix];
      return Object.entries(value)
        .flatMap(([key, nested]) => keys(nested, prefix ? `${prefix}.${key}` : key))
        .sort();
    };

    expect(keys(hindi)).toEqual(keys(english));
  });
});
