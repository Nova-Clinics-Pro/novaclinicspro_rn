import { getPasswordRecoveryRedirect, parsePasswordRecoveryCallback, INVALID_RECOVERY_LINK } from '../../../features/auth/presentation/recovery-links';
const mockRuntime = { platform: 'android', environment: 'storeClient', callback: 'exp://192.168.50.20:8081/--/reset-password' };
jest.mock('react-native', () => ({ Platform: { get OS() { return mockRuntime.platform; } } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { get executionEnvironment() { return mockRuntime.environment; } }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
jest.mock('expo-linking', () => ({ createURL: jest.fn(() => mockRuntime.callback) }));

const fragment = '#type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh';
describe('password recovery callback URLs', () => {
  beforeEach(() => { mockRuntime.platform = 'android'; mockRuntime.environment = 'storeClient'; mockRuntime.callback = 'exp://192.168.50.20:8081/--/reset-password'; });
  it('uses the current Expo host for browser recovery on a physical phone', () => {
    expect(getPasswordRecoveryRedirect()).toBe('http://192.168.50.20:8081/reset-password');
  });
  it('preserves HTTPS for secure Expo host URLs', () => {
    mockRuntime.callback = 'exps://preview.example.test/--/reset-password';
    expect(getPasswordRecoveryRedirect()).toBe('https://preview.example.test/reset-password');
  });
  it('uses the registered native scheme outside Expo Go', () => {
    mockRuntime.environment = 'standalone'; mockRuntime.callback = 'frontend://reset-password';
    expect(getPasswordRecoveryRedirect()).toBe('frontend://reset-password');
  });
  it('uses the current browser origin on web', () => {
    mockRuntime.platform = 'web';
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'https://uat.example.test' } } });
    try { expect(getPasswordRecoveryRedirect()).toBe('https://uat.example.test/reset-password'); }
    finally { if (previous) Object.defineProperty(globalThis, 'window', previous); else Reflect.deleteProperty(globalThis, 'window'); }
  });
  it.each(['http://uat.example.test/reset-password', 'frontend://reset-password', 'exp://192.168.50.20:8081/--/reset-password'])('parses the recovery-only credentials for %s', url => {
    expect(parsePasswordRecoveryCallback(url + fragment)).toEqual({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' });
  });
  it.each([
    'not-a-url', 'https://uat.example.test/reset-password',
    'https://uat.example.test/login' + fragment,
    'https://uat.example.test/reset-password#type=signup&access_token=synthetic-access&refresh_token=synthetic-refresh',
    'https://uat.example.test/reset-password#type=recovery&access_token=synthetic-access',
    'https://uat.example.test/reset-password#error_code=otp_expired&error_description=synthetic-error',
    'https://uat.example.test/reset-password?error_code=otp_expired' + fragment,
    'https://uat.example.test/reset-password?code=unsupported-code',
  ])('rejects invalid, expired/reused or non-recovery callbacks without leaking input', url => {
    expect(() => parsePasswordRecoveryCallback(url)).toThrow(INVALID_RECOVERY_LINK);
  });
});
