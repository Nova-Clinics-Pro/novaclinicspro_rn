import enUS from '../../core/localization/translations/en-US.json';
import hiIN from '../../core/localization/translations/hi-IN.json';

const flatten = (
  value: unknown,
  prefix = ''
): Record<string, string> => {
  if (typeof value === 'string') return { [prefix]: value };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Record<string, string>>(
    (result, [key, child]) => ({
      ...result,
      ...flatten(child, prefix ? `${prefix}.${key}` : key),
    }),
    {}
  );
};

const placeholders = (value: string) =>
  [...value.matchAll(/\{\{([^}]+)\}\}/g)]
    .map((match) => match[1])
    .sort();

describe('TG23 conflict localization', () => {
  it('keeps English and Hindi conflict key and placeholder parity', () => {
    const english = flatten(
      enUS.onboarding.progressiveExperience.conflict,
      'onboarding.progressiveExperience.conflict'
    );
    const hindi = flatten(
      hiIN.onboarding.progressiveExperience.conflict,
      'onboarding.progressiveExperience.conflict'
    );

    expect(Object.keys(hindi).sort()).toEqual(Object.keys(english).sort());
    Object.keys(english).forEach((key) => {
      expect(placeholders(hindi[key])).toEqual(placeholders(english[key]));
    });
  });

  it('does not expose technical revision vocabulary in conflict copy', () => {
    const englishCopy = Object.values(
      flatten(enUS.onboarding.progressiveExperience.conflict)
    ).join(' ');
    expect(englishCopy).not.toMatch(/step-rev|cap-v1|revision|backend|provider/i);
  });
});
