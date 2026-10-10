import type { RouteComponent } from 'vue-router'

export interface ModuleRoute {
  /** Path relative to the module, e.g. '' or 'history'. Mounted under `/<module id>/`. */
  path: string
  component: () => Promise<RouteComponent>
}

export interface ModuleManifest {
  /** Must equal the module's folder name; also the route and table prefix. */
  id: string
  name: string
  description?: string
  /** A single emoji shown in the launcher. */
  icon: string
  routes: ModuleRoute[]
}
