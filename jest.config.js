module.exports = {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs', 'json'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  collectCoverageFrom: [
    'models/**/*.js',
    'utils/**/*.js',
    'config/**/*.js',
    '!**/node_modules/**'
  ],
  verbose: true,
  setupFilesAfterEnv: ['./setup.js'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true
};
