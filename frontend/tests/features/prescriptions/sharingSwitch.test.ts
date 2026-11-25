import { isSharingEnabled } from '../../../features/prescriptions/domain/sharingSwitch';

describe('the prescription sharing switch', () => {
  it('is off unless the deployment says "true"', () => {
    expect(isSharingEnabled({})).toBe(false);
    expect(isSharingEnabled({ EXPO_PUBLIC_PRESCRIPTION_SHARING_ENABLED: 'false' })).toBe(false);
    expect(isSharingEnabled({ EXPO_PUBLIC_PRESCRIPTION_SHARING_ENABLED: '1' })).toBe(false);
    expect(isSharingEnabled({ EXPO_PUBLIC_PRESCRIPTION_SHARING_ENABLED: 'true' })).toBe(true);
  });
});
