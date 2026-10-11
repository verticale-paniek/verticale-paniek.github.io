import type { ModuleManifest } from '~/shell/types'

export default {
  id: 'toplogger',
  name: 'TopLogger Plus',
  description: 'Work in progress: API proof of concept',
  icon: '🧗',
  routes: [{ path: '', component: () => import('./pages/Index.vue') }],
} satisfies ModuleManifest
