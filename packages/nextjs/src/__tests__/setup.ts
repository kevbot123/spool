// Global test setup
global.fetch = jest.fn();

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  // Clear the request cache between tests and disable caching
  const contentModule = require('../utils/content');
  if (contentModule.__testing__) {
    contentModule.__testing__.clearCache();
    contentModule.__testing__.disableCache = true;
  }
});