import { describe, expect, it } from 'vitest'
import { effectScope, ref } from 'vue'
import { useRouteViewer } from '../app/modules/toplogger/useRouteViewer'
import { fetchClimbers, fetchViewingRoutes } from '../supabase/functions/_shared/toplogger/viewing'
import type { Call } from '../supabase/functions/_shared/toplogger/ops'
import type { Route } from '../app/shell/toplogger/domain'

it('deduplicates gym climbers and validates the target before fetching progress', async () => {
  const call = (async () => ({ gymUsers: { data: [{ user: { id: 'a', fullName: 'A' } }, { user: { id: 'a', fullName: 'A' } }], pagination: { page: 1, perPage: 100, total: 2 } } })) as Call
  expect(await fetchClimbers(call, 'gym')).toEqual([{ id: 'a', fullName: 'A' }])
  await expect(fetchViewingRoutes(call, 'gym', 'bad id')).rejects.toThrow('Invalid climber')
})

it('fetches progress for the requested climber using the supplied caller', async () => {
  const call = (async (_query, variables) => {
    expect(variables).toMatchObject({ userId: 'other', gymId: 'gym' })
    return { climbs: { data: [], pagination: { page: 1, perPage: 100, total: 0 } } }
  }) as Call
  expect(await fetchViewingRoutes(call, 'gym', 'other')).toEqual([])
})

describe('temporary route perspective', () => {
  function setup() {
    const pending: ((routes: Route[]) => void)[] = []
    const scope = effectScope()
    const accountGym = ref('me:gym')
    const viewer = scope.run(() => useRouteViewer(accountGym, ref('gym'), <T>() => new Promise<T>(resolve => pending.push(value => resolve(value as T)))))!
    viewer.climbers.value = [{ id: 'a', fullName: 'A' }, { id: 'b', fullName: 'B' }]
    return { viewer, pending, scope, accountGym }
  }

  it('ignores a slower response for the previous climber', async () => {
    const { viewer, pending, scope } = setup()
    const a = viewer.select('a')
    const b = viewer.select('b')
    pending[1]!([{ id: 'b-route' } as Route])
    await b
    pending[0]!([{ id: 'a-route' } as Route])
    await a
    expect(viewer.routes.value.map(r => r.id)).toEqual(['b-route'])
    expect(viewer.name.value).toBe('B')
    scope.stop()
  })

  it.each(['exit', 'scope'] as const)('discards in-flight progress after %s', async (action) => {
    const { viewer, pending, scope, accountGym } = setup()
    const work = viewer.select('a')
    if (action === 'exit') {
      viewer.exit()
    }
    else { accountGym.value = 'other:gym' }
    pending[0]!([{ id: 'stale' } as Route])
    await work
    expect(viewer.selected.value).toBeNull()
    expect(viewer.routes.value).toEqual([])
    expect(viewer.busy.value).toBe(false)
    scope.stop()
  })
})
