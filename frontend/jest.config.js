// Phase 1 · T-0.1b — minimum test-runner wiring so the existing frontend test
// suite can execute. Uses the Expo-provided jest preset (RN + TS/TSX transform).
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@tanstack/.*|zustand))',
  ],
  moduleNameMapper: {
    '^immer$': '<rootDir>/node_modules/immer/dist/cjs/immer.cjs.development.js',
  },
};
