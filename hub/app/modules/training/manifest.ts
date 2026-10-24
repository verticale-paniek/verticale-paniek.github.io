import type { ModuleManifest } from '~/shell/types'

export default {
  id: 'training',
  name: 'TL Training',
  description: 'Make training sessions from circuits and run their timers',
  icon: '🏋️',
  routes: [
    { path: '', component: () => import('./pages/Sessions.vue') },
    { path: 'run', component: () => import('./pages/SessionRun.vue') },
    { path: 'manage', component: () => import('./pages/SessionsManage.vue') },
    { path: 'edit', component: () => import('./pages/SessionEdit.vue') },
    { path: 'block-edit', component: () => import('./pages/BlockEdit.vue') },
  ],
} satisfies ModuleManifest
