import type { ModuleManifest } from '~/shell/types'

export default {
  id: 'training',
  name: 'TL Training',
  description: 'Build a strength circuit and run its timers',
  icon: '🏋️',
  routes: [
    { path: '', component: () => import('./pages/Index.vue') },
    { path: 'run', component: () => import('./pages/Run.vue') },
  ],
} satisfies ModuleManifest
