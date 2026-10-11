import type { ModuleManifest } from '~/shell/types'

export default {
  id: 'toplogger',
  name: 'TopLogger Plus',
  description: 'Work in progress: connect your TopLogger account',
  icon: '🧗',
  routes: [
    { path: '', component: () => import('./pages/Index.vue') },
    { path: 'poc', component: () => import('./pages/Poc.vue') },
  ],
} satisfies ModuleManifest
