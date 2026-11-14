/**
 * Jest configuration for Doctor Dashboard UX refactor tests.
 *
 * Run from frontend/:
 *   npx jest --config tests/features/doctorDashboard/jest.config.js --runInBand
 */

const path = require('path');
const frontendRoot = path.resolve(module.path, '../../..');

module.exports = {
  rootDir: frontendRoot,
  testEnvironment: 'node',
  testMatch: ['**/tests/features/doctorDashboard/**/*.test.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', {
      presets: [
        require.resolve('@react-native/babel-preset'),
      ],
      plugins: [
        require.resolve('@babel/plugin-transform-modules-commonjs'),
      ],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community/datetimepicker|expo|@expo|@testing-library|@tanstack|react-native-safe-area-context|react-native-screens)/)'],
  setupFiles: ['react-native/jest/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/features/doctorDashboard/setup.ts'],
  testTimeout: 15000,
  verbose: true,
};
