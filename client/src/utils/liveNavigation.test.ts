import assert from 'node:assert/strict'
import { getLiveSessionTargetPath, isEndedLiveStatus } from './liveNavigation'

assert.equal(isEndedLiveStatus('已结束'), true)
assert.equal(isEndedLiveStatus('宸茬粨鏉?'), true)
assert.equal(isEndedLiveStatus('进行中'), false)
assert.equal(isEndedLiveStatus('已排期'), false)

assert.equal(getLiveSessionTargetPath({ live_id: 'LIVE001', live_status: '已结束' }), '/live-reviews?liveId=LIVE001')
assert.equal(getLiveSessionTargetPath({ live_id: 'LIVE002', live_status: '宸茬粨鏉?' }), '/live-reviews?liveId=LIVE002')
assert.equal(getLiveSessionTargetPath({ live_id: 'LIVE003', live_status: '进行中' }), '/monitor?id=LIVE003')

console.log('live navigation tests passed')
