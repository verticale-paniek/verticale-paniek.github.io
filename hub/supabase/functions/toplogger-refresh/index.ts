// Scheduled renewal of TopLogger connections, so a connection nobody opens does not expire.
// Called daily by pg_cron (see the toplogger_refresh_schedule migration) with a shared secret header; it is
// not reachable by users. Each run renews connections whose refresh token expires within RENEW_WITHIN_DAYS
// (refresh tokens last 14 days and slide on every exchange). A failed renewal is simply retried at the
// next run, so there are no retry loops. Only counts are logged, never tokens or user ids.
import { respond } from '../_shared/http.ts'
import { ConnectionError, dueConnections, renewConnection } from '../_shared/toplogger/store.ts'
import { TopLoggerError } from '../_shared/toplogger/graphql.ts'

const RENEW_WITHIN_DAYS = 10 // renew once a connection has been idle for ~4 days; daily runs give ~10 tries
const MAX_PER_RUN = 50
const CONCURRENCY = 5

/** Constant-time comparison (hash both sides so lengths cannot leak). */
async function sameSecret(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([a, b].map(async s => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))))
  let diff = 0
  for (let i = 0; i < x!.length; i++) {
    diff |= x![i]! ^ y![i]!
  }
  return diff === 0
}

Deno.serve(async (req) => {
  const expected = Deno.env.get('TOPLOGGER_CRON_SECRET') ?? ''
  const given = req.headers.get('x-cron-secret') ?? ''
  if (req.method !== 'POST' || !expected || !(await sameSecret(given, expected))) {
    return respond(req, 401, { error: 'Not allowed' })
  }

  const cutoff = new Date(Date.now() + RENEW_WITHIN_DAYS * 86_400_000)
  const due = await dueConnections(cutoff, MAX_PER_RUN)
  const result = { due: due.length, renewed: 0, skipped: 0, reconnectRequired: 0, failed: 0 }

  const queue = [...due]
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let userId = queue.shift(); userId; userId = queue.shift()) {
      try {
        const outcome = await renewConnection(userId)
        if (outcome === 'renewed') {
          result.renewed++
        }
        else {
          result.skipped++
        }
      }
      catch (error) {
        if (error instanceof ConnectionError && error.code === 'reconnect_required') {
          result.reconnectRequired++
        }
        else {
          result.failed++
        }
        if (!(error instanceof ConnectionError || error instanceof TopLoggerError)) {
          console.error('toplogger-refresh: unexpected error', (error as Error)?.name)
        }
      }
    }
  }))

  console.log('toplogger-refresh', JSON.stringify(result))
  return respond(req, 200, result)
})
