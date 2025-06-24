module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)'],
  testPathIgnorePatterns: ['/node_modules/', '/src/app/'],
  setupFiles: ['<rootDir>/jest.env.js'],
};
