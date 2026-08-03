import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: [
      'src/components/predictive-maintenance/**/*.{js,jsx}',
      'src/pages/PredictiveMaintenance/**/*.{js,jsx}',
      'src/pages/AuditLog/**/*.{js,jsx}',
      'src/App.jsx',
      'src/components/brand/**/*.{js,jsx}',
      'src/components/ai/markdown.jsx',
      'src/components/ai/AIPageInsights.jsx',
      'src/components/layout/Header.jsx',
      'src/components/layout/Sidebar.jsx',
      'src/pages/Login/**/*.{js,jsx}',
      'src/pages/Commissioning/**/*.{js,jsx}',
      'src/pages/Map/**/*.{js,jsx}',
      'src/api/ai.js',
      'src/api/audit.js',
      'src/utils/auditLog.js',
      'src/utils/helpers.js',
      'src/services/predictiveMaintenanceService.js',
      'src/types/predictiveMaintenance.js',
      'src/test/**/*.{js,jsx}',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/pages/Map/**/*.{js,jsx}'],
    rules: {
      // This page intentionally mirrors external map/device state into local UI state.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]
