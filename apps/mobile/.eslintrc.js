module.exports = {
  root: true,
  extends: ['@react-native'],
  plugins: ['react-hooks', 'jest'],
  env: {
    node: true,
    es6: true,
    'jest/globals': true,
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
