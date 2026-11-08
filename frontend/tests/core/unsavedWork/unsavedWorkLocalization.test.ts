import enUS from '../../../core/localization/translations/en-US.json';
import hiIN from '../../../core/localization/translations/hi-IN.json';

const REQUIRED = [
  'title', 'prescriptionDraft', 'message', 'save', 'discard', 'cancel', 'saveFailed', 'discardFailed', 'tenantMismatch',
  'intent.exit', 'intent.deepLink', 'intent.completion', 'intent.logout',
];

const dig = (bundle: any, key: string): unknown => key.split('.').reduce((node, part) => node?.[part], bundle.unsavedWork);
const placeholders = (value: string) => [...value.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]).sort();

describe.each([['en-US', enUS], ['hi-IN', hiIN]])('unsavedWork strings (%s)', (_locale, bundle) => {
  it.each(REQUIRED)('defines a non-empty string for unsavedWork.%s', (key) => {
    const value = dig(bundle, key);
    expect(typeof value).toBe('string');
    expect((value as string).trim().length).toBeGreaterThan(0);
  });
});

it('both locales use the same interpolation placeholders for every key', () => {
  for (const key of REQUIRED) {
    expect(placeholders(dig(hiIN, key) as string)).toEqual(placeholders(dig(enUS, key) as string));
  }
  expect(placeholders(dig(enUS, 'message') as string)).toEqual(['items']);
});
