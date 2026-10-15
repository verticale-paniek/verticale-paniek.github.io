// The TopLogger GraphQL operations this app is allowed to send. Callers pick an action; they never supply
// query text. Field lists were ported from the original Android app (verified against the live schema there).
export const ROUTE_FIELDS = `id grade name label inAt outAt outPlannedAt setterName leadEnabled leadRequired
  climbSetters { gymAdmin { name } } wall { nameLoc } holdColor { color nameLoc }
  climbUser(userId: $userId) { grade tickType totalTries totalTicks triedFirstAtDate tickedFirstAtDate }`

export const ROUTES = `query PlusRoutes($gymId: ID!, $userId: ID!, $pagination: PaginationInputClimbs) {
  climbs(gymId: $gymId, climbType: route, pagination: $pagination) { pagination { total page perPage } data { ${ROUTE_FIELDS} } }
}`
