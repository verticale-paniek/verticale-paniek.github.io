import type { ModuleManifest } from '~/shell/types'

export default {
  id: 'hello-b',
  name: 'Hello B',
  description: 'Example module with two pages',
  icon: '🧗',
  routes: [
    { path: '', component: () => import('./pages/Index.vue') },
    { path: 'details', component: () => import('./pages/Details.vue') },
  ],
} satisfies ModuleManifest
