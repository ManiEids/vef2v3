import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['**/*.ts'],
  plugins: {
    '@typescript-eslint': tseslint.plugin,
  },
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      project: './tsconfig.json',
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
  },
});
