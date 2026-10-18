import type { ModuleManifest } from '~/shell/types'

export default {
  id: 'training',
  name: 'TL Training',
  description: 'Klimax training: strength circuits and progress',
  icon: '🏋️',
  routes: [
    { path: '', component: () => import('./pages/Index.vue') },
    { path: 'circuit', component: () => import('./pages/Circuit.vue') },
  ],
} satisfies ModuleManifest
