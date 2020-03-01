module.exports = {
  root: true,
  env: {
    node: true
  },
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  parserOptions: {
    ecmaVersion: 2015,
    project: './tsconfig.json'
  },
  rules: {
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    semi: ['error', 'always'],
    // 'no-return-await': 'off',
    'template-curly-spacing': ['error', 'always'],
    // 'space-before-function-paren': 'off',
    // 'object-curly-spacing': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    // 'no-prototype-builtins': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    // '@typescript-eslint/no-var-requires': 'off',
    // '@typescript-eslint/no-unused-vars': 'off',
    // 'no-fallthrough': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'no-constant-condition': 'off',
    'no-this-assignment': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    'no-prototype-builtins': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-var-requires': 'off'
    // '@typescript-eslint/member-delimiter-style': 'off',
    // '@typescript-eslint/no-inferrable-types': 'off'
  }
};
