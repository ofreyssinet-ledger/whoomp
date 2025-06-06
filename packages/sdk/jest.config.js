const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  roots: ['<rootDir>/src'],
  // anything that ends with .test.ts
  testRegex: '.*\\.test\\.ts$',
  moduleFileExtensions: ['js', 'ts'],
};
