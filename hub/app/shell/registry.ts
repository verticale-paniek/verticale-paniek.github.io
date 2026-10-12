import type { RouteRecordRaw } from 'vue-router'
import type { ModuleManifest } from './types'

type ManifestImport = { default: ModuleManifest }

/** Turns the manifest glob result (one entry per module folder) into a validated, sorted list. */
export function buildRegistry(imports: Record<string, ManifestImport>): ModuleManifest[] {
  const seen = new Set<string>()
  const manifests: ModuleManifest[] = []
  for (const [file, mod] of Object.entries(imports)) {
    const folder = file.split('/').slice(-2, -1)[0]
    const manifest = mod.default
    if (manifest.id !== folder) {
      throw new Error(`Module manifest id "${manifest.id}" must match its folder "${folder}"`)
    }
    if (seen.has(manifest.id)) {
      throw new Error(`Duplicate module id "${manifest.id}"`)
    }
    seen.add(manifest.id)
    manifests.push(manifest)
  }
  return manifests.sort((a, b) => a.name.localeCompare(b.name))
}

export function moduleRoutes(manifest: ModuleManifest): RouteRecordRaw[] {
  return manifest.routes.map(route => ({
    name: `${manifest.id}${route.path ? `-${route.path.replace(/\//g, '-')}` : ''}`,
    path: route.path ? `/${manifest.id}/${route.path}` : `/${manifest.id}`,
    component: route.component,
    meta: { module: manifest.id },
  }))
}
