const path = require('path');
const dotenv = require('dotenv');

// Cargar .env desde la raíz del monorepo o local de apps/api
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@glamos/shared$': '<rootDir>/../../packages/shared/src',
  },
};
