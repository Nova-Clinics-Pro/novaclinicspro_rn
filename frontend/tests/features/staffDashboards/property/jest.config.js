/**
 * Jest Configuration for staffDashboards Property-Based Tests
 *
 * Uses a minimal Node.js environment — no React Native preset needed
 * because these tests target pure data-layer logic (API functions, query keys).
 *
 * Run from the frontend/ directory:
 *   npx jest --config tests/features/staffDashboards/property/jest.config.js --forceExit
 */

const path = require('path');
const frontendRoot = path.resolve(module.path, '../../../..');

module.exports = {
  rootDir: frontendRoot,
  testEnvironment: 'node',
  testMatch: ['**/tests/features/staffDashboards/property/**/*.test.{ts,tsx}'],
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
