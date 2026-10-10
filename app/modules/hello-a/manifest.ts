import type { ModuleManifest } from '~/shell/types'

export default {
  id: 'hello-a',
  name: 'Hello A',
  description: 'Example module: a counter kept on this device',
  icon: '👋',
  routes: [{ path: '', component: () => import('./pages/Index.vue') }],
} satisfies ModuleManifest
