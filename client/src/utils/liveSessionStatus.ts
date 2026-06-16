export const LIVE_SESSION_STATUS_ORDER = ['待安排', '已排期', '进行中', '已结束'] as const

export type LiveSessionStatusName = typeof LIVE_SESSION_STATUS_ORDER[number]

export function nextStatusFilter(current: string, clicked: string) {
  return current === clicked ? '' : clicked
}

export function countLiveSessionStatuses(sessions: Array<{ live_status?: string | null }>) {
  return LIVE_SESSION_STATUS_ORDER.reduce((acc, status) => {
    acc[status] = sessions.filter((item) => item.live_status === status).length
    return acc
  }, {} as Record<LiveSessionStatusName, number>)
}
