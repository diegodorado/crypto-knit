module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:@typescript-eslint/recommended",
    /*

     * Disable rules that could conflict with prettier
     * as prettier should be run before eslint and will
     * catch those.
     * Make sure this is the last extension
     */
    "eslint-config-prettier"
    // 'prettier',
  ],
  rules: {
  },
}
