// Phase 1 · T-0.1b — test-runner setup.
// AsyncStorage's native module is unavailable in the jest environment; use the
// library's official jest mock so suites that transitively import it can run.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Unit tests must never require live Supabase credentials. These inert values
// satisfy client construction only; every network boundary remains mocked by
// the owning test suite.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.EXPO_PUBLIC_API_BASE_URL ??= 'https://example.invalid';

// Expo native modules are unavailable in Jest. Keep their browser/native
// behavior out of unit tests while preserving the application import contract.
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
