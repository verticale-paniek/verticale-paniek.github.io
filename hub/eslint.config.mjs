import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
    'vue/html-closing-bracket-newline': ['error', { singleline: 'never', multiline: 'always' }],
    'vue/max-attributes-per-line': ['error', { singleline: { max: 5 }, multiline: { max: 1 } }],
    'vue/multi-word-component-names': 'off',
    'curly': ['error', 'all'],
  },
})
