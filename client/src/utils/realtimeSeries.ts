export interface RealtimeSeriesInput {
  labels: string[]
  online: number[]
  gmv: number[]
  label: string
  onlineValue: number
  gmvValue: number
  maxPoints?: number
}

export function appendRealtimePoint(input: RealtimeSeriesInput) {
  const maxPoints = input.maxPoints ?? 60
  const labels = [...input.labels, input.label].slice(-maxPoints)
  const online = [...input.online, input.onlineValue].slice(-maxPoints)
  const gmv = [...input.gmv, input.gmvValue].slice(-maxPoints)

  return { labels, online, gmv }
}

export function secondsSince(startTimeMs: number, nowMs = Date.now()) {
  return Math.max(0, Math.floor((nowMs - startTimeMs) / 1000))
}
