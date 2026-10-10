import type { ModuleManifest } from '~/shell/types'

// Copy this folder to app/modules/<your-id>/ and change `id` to the folder name.
export default {
  id: '_template',
  name: 'Template',
  icon: '🧩',
  routes: [{ path: '', component: () => import('./pages/Index.vue') }],
} satisfies ModuleManifest
