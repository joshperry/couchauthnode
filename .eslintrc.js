module.exports = {
  extends: 'airbnb-base',
  rules: {
    semi: ['error', 'never'],
    'no-console': 'off',
    'one-var': 'off',
    indent: ['error', 2, {
      VariableDeclarator: 'first',
    }],
    'keyword-spacing': ['error', { after: false, overrides: { return: { after: true }, try: { after: true }, case: { after: true }, else: { after: true }, } }],
    'prefer-destructuring': ['error', { array: false }],
    'no-underscore-dangle': 'off',
  }
}
