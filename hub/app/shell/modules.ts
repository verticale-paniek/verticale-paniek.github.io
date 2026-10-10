import { buildRegistry } from './registry'

// `_template` is a copy-me starting point and is deliberately not registered.
export const modules = buildRegistry(
  import.meta.glob(['../modules/*/manifest.ts', '!../modules/_template/**'], { eager: true }),
)
