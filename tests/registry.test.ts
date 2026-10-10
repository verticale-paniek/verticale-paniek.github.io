import { describe, expect, it } from 'vitest'
import { buildRegistry, moduleRoutes } from '~/shell/registry'
import type { ModuleManifest } from '~/shell/types'

const manifest = (id: string, paths = ['']): { default: ModuleManifest } => ({
  default: { id, name: id, icon: 'x', routes: paths.map(path => ({ path, component: async () => ({}) })) },
})

describe('buildRegistry', () => {
  it('sorts modules by name', () => {
    const result = buildRegistry({ '../modules/b/manifest.ts': manifest('b'), '../modules/a/manifest.ts': manifest('a') })
    expect(result.map(m => m.id)).toEqual(['a', 'b'])
  })

  it('rejects a manifest whose id differs from its folder', () => {
    expect(() => buildRegistry({ '../modules/foo/manifest.ts': manifest('bar') })).toThrow(/must match its folder/)
  })
})

describe('moduleRoutes', () => {
  it('mounts routes under the module id', () => {
    const [root, nested] = moduleRoutes(manifest('fitness', ['', 'log/today']).default)
    expect(root!.path).toBe('/fitness')
    expect(nested!.path).toBe('/fitness/log/today')
    expect(nested!.name).toBe('fitness-log-today')
  })
})
