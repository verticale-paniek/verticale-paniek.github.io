import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { modules } from '~/shell/modules'

const modulesDir = join(import.meta.dirname, '../app/modules')
const folders = readdirSync(modulesDir).filter(f => statSync(join(modulesDir, f)).isDirectory())

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|vue)$/.test(entry) ? [path] : []
  })
}

describe('modules', () => {
  it('registers every module folder except _template', () => {
    expect(modules.map(m => m.id).sort()).toEqual(folders.filter(f => f !== '_template').sort())
  })

  it.each(folders)('%s does not import from another module', (folder) => {
    const others = folders.filter(f => f !== folder)
    for (const file of sourceFiles(join(modulesDir, folder))) {
      const imports = [...readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(m => m[1]!)
      for (const spec of imports) {
        for (const other of others) {
          const reachesOther = spec.includes(`modules/${other}/`) || spec.endsWith(`modules/${other}`) || spec.startsWith(`../${other}`)
          expect(reachesOther, `${file} imports module "${other}"`).toBe(false)
        }
      }
    }
  })
})
