import { TopLoggerError } from './graphql.ts'

/** The uploads host does not permit browser reads from our origin. Only proxy public floorplan SVGs. */
export async function fetchFloorplan(path: unknown): Promise<{ svg: string }> {
  if (typeof path !== 'string' || !/^gyms\/[\w-]+\/floorplans\/[\w.-]+\.svg$/.test(path)) {
    throw new TopLoggerError('api', 'Invalid floorplan path.')
  }
  try {
    const response = await fetch(`https://uploads.toplogger.nu/${path}`, {
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok || !response.headers.get('content-type')?.includes('image/svg+xml')) {
      throw new Error('Invalid floorplan response')
    }
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Empty floorplan')
    }
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        size += value.byteLength
        if (size > 2_000_000) {
          throw new Error('Floorplan too large')
        }
        chunks.push(value)
      }
    }
    finally {
      await reader.cancel()
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return { svg: new TextDecoder().decode(bytes) }
  }
  catch {
    throw new TopLoggerError('network', 'Could not load the gym floorplan.')
  }
}
