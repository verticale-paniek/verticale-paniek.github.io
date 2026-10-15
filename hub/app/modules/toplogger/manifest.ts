import type { ModuleManifest } from '~/shell/types'

export default {
  id: 'toplogger',
  name: 'TopLogger Plus',
  description: 'Routes, ascents and your Top 10 for TopLogger gyms',
  icon: '🧗',
  routes: [
    { path: '', component: () => import('./pages/Index.vue') },
    { path: 'account', component: () => import('./pages/Account.vue') },
  ],
} satisfies ModuleManifest
