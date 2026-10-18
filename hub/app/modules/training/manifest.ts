import type { ModuleManifest } from '~/shell/types'

export default {
  id: 'training',
  name: 'TL Training',
  description: 'Build a strength circuit and run its timers',
  icon: '🏋️',
  routes: [
    { path: '', component: () => import('./pages/Run.vue') },
    { path: 'edit', component: () => import('./pages/Edit.vue') },
  ],
} satisfies ModuleManifest
