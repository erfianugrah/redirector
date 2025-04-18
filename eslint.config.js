import globals from 'globals';
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        ...globals.node,
        ...globals.worker,
        'Cloudflare': 'readonly',
        'KVNamespace': 'readonly',
        'Response': 'readonly',
        'Request': 'readonly',
        'Headers': 'readonly',
        'URL': 'readonly',
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'indent': ['error', 2],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always'],
      'no-console': ['warn', { 'allow': ['warn', 'error', 'info'] }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-undef': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      '*.js',
    ],
  },
  prettierConfig,
];