const ENDED_STATUSES = new Set(['已结束', '宸茬粨鏉?'])

export function isEndedLiveStatus(status: string) {
  return ENDED_STATUSES.has(String(status || '').trim())
}

export function getLiveSessionTargetPath(session: { live_id: string; live_status: string }) {
  if (isEndedLiveStatus(session.live_status)) {
    return `/live-reviews?liveId=${session.live_id}`
  }
  return `/monitor?id=${session.live_id}`
}
