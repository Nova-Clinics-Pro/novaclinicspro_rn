import {
  formatJourneyVersion,
  isSupportedJourneyVersion,
  parseJourneyVersion,
  PROGRESSIVE_EXPERIENCE_JOURNEY_VERSION,
} from '../../features/onboarding/domain/entities/journey.entity';

describe('Journey domain versioning', () => {
  it('exposes the approved initial journey version independently', () => {
    expect(formatJourneyVersion(PROGRESSIVE_EXPERIENCE_JOURNEY_VERSION)).toBe('1.0.0');
  });

  it('parses stable semantic versions', () => {
    expect(parseJourneyVersion('1.12.3')).toEqual({ major: 1, minor: 12, patch: 3 });
  });

  it.each(['1.0', 'v1.0.0', '1.01.0', '-1.0.0', '1.0.0-beta'])(
    'rejects invalid journey version %s',
    (value) => {
      expect(parseJourneyVersion(value)).toBeNull();
    }
  );

  it('supports compatible major-one versions and rejects other majors', () => {
    expect(isSupportedJourneyVersion({ major: 1, minor: 9, patch: 4 })).toBe(true);
    expect(isSupportedJourneyVersion({ major: 2, minor: 0, patch: 0 })).toBe(false);
  });
});
