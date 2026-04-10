import airdevPlugin from '@airdev/eslint';
import globals from 'globals';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'src/**/*.ejs'],
  },
  ...tseslint.configs.recommended,
  prettierRecommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      airdev: airdevPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      'airdev/no-negative-names': 'error',
      'airdev/no-relative-parent-imports': 'error',
      'airdev/require-relative-child-imports': 'error',
      'airdev/require-await': 'error',
      'airdev/no-specific-string': [
        'error',
        [
          {
            name: 'process.env',
            description: 'Move environment access into src/config.ts.',
            excludedFiles: ['src/config.ts'],
          },
          {
            name: 'console.debug',
            description: 'Replace it with logDebug.',
            replacement: 'logDebug',
            includedFiles: ['src/**/*.ts'],
            excludedFiles: ['src/utils/log.ts'],
          },
          {
            name: 'console.log',
            description: 'Replace it with logInfo.',
            replacement: 'logInfo',
            includedFiles: ['src/**/*.ts'],
            excludedFiles: ['src/utils/log.ts'],
          },
          {
            name: 'console.info',
            description: 'Replace it with logInfo.',
            replacement: 'logInfo',
            includedFiles: ['src/**/*.ts'],
            excludedFiles: ['src/utils/log.ts'],
          },
          {
            name: 'console.warn',
            description: 'Replace it with logWarn.',
            replacement: 'logWarn',
            includedFiles: ['src/**/*.ts'],
            excludedFiles: ['src/utils/log.ts'],
          },
          {
            name: 'console.error',
            description: 'Replace it with logError.',
            replacement: 'logError',
            includedFiles: ['src/**/*.ts'],
            excludedFiles: ['src/utils/log.ts'],
          },
        ],
      ],
    },
  },
);
