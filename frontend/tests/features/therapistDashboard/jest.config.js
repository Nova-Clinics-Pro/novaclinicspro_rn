/**
 * Jest Configuration for therapistDashboard — combined unit + property tests
 *
 * Runs all tests under:
 *   tests/features/therapistDashboard/unit/
 *   tests/features/therapistDashboard/property/
 *
 * Run from the workspace root:
 *   npx jest --config frontend/tests/features/therapistDashboard/jest.config.js --forceExit
 */

const path = require('path');
const frontendRoot = path.resolve(module.path, '../../..');

module.exports = {
  rootDir: frontendRoot,
  testEnvironment: 'node',
  testMatch: [
    '**/tests/features/therapistDashboard/unit/**/*.test.{ts,tsx}',
    '**/tests/features/therapistDashboard/property/**/*.test.{ts,tsx}',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', {
      presets: [
        require.resolve('babel-preset-current-node-syntax'),
        require.resolve('@babel/preset-typescript'),
      ],
      plugins: [
        require.resolve('@babel/plugin-transform-modules-commonjs'),
      ],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(fast-check)/)',
  ],
  testTimeout: 30000,
  verbose: true,
};
