import { shareOutcome } from '../../features/prescriptions/domain/shareOutcome';

describe('shareOutcome', () => {
  it('a delivered share is sent (an older backend that omits `delivered` counts as delivered)', () => {
    expect(shareOutcome({ success: true, delivered: true })).toBe('sent');
    expect(shareOutcome({ success: true })).toBe('sent');
  });

  it('a share only recorded by a logging channel is never reported as sent', () => {
    expect(shareOutcome({ success: true, delivered: false })).toBe('recorded_not_sent');
  });

  it('a failed share is failed', () => {
    expect(shareOutcome({ success: false, delivered: false })).toBe('failed');
  });
});
