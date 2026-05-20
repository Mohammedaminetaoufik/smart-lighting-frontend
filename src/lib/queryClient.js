import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s — most data tolerates brief staleness
      gcTime: 5 * 60_000,         // 5min cache retention
      refetchOnWindowFocus: false, // too noisy for admin app
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})

/* Shared query keys to keep cache invalidation consistent */
export const QK = {
  dashboard:        ['dashboard-stats'],
  alertCounts:      ['alert-counts'],
  alerts:           (filters) => ['alerts', filters],
  alertSummary:     ['alerts-summary'],
  lampadaires:      (filters) => ['lampadaires', filters],
  lampadairesMissing: ['lampadaires-missing'],
  lcus:             ['lcus'],
  users:            ['users'],
  workorders:       ['workorders'],
  auditLogs:        (filters) => ['audit-logs', filters],
}
