// The Next.js plugin ships flat configs only; reuse its Core Web Vitals rules here.
const nextRules = require('@next/eslint-plugin-next').configs['core-web-vitals'].rules;

module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'dev-dist', 'node_modules', '*.cjs', '.next', 'out', 'next-env.d.ts'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@next/next'],
  rules: {
    ...nextRules,
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-empty': ['warn', { allowEmptyCatch: true }],
  },
};
