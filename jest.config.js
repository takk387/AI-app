/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',

  // Use projects for different test environments
  projects: [
    // Node environment for services and backend tests
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '**/tests/**/*.test.ts',
        '**/tests/**/*.test.tsx',
        '**/src/services/__tests__/**/*.test.ts',
        '**/src/__tests__/**/*.test.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    },
    // JSDOM environment for React hooks and component tests
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '**/src/hooks/__tests__/**/*.test.ts',
        '**/src/hooks/__tests__/**/*.test.tsx',
        '**/src/components/__tests__/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup.ts',
        '<rootDir>/tests/setup-react.ts',
      ],
    },
  ],

  // Ignore patterns (applies to all projects)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/archive/',
  ],

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Verbose output
  verbose: true,
};

module.exports = config;
