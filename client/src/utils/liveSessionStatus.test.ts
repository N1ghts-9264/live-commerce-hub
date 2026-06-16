import assert from 'node:assert/strict'
import { LIVE_SESSION_STATUS_ORDER, countLiveSessionStatuses, nextStatusFilter } from './liveSessionStatus'

const sessions = [
  { live_status: '待安排' },
  { live_status: '待安排' },
  { live_status: '进行中' },
  { live_status: '进行中' },
  { live_status: '已排期' },
  { live_status: '已排期' },
  { live_status: '已结束' },
  { live_status: '已结束' },
]

assert.deepEqual([...LIVE_SESSION_STATUS_ORDER], ['待安排', '已排期', '进行中', '已结束'])
assert.deepEqual(countLiveSessionStatuses(sessions), {
  '待安排': 2,
  '已排期': 2,
  '进行中': 2,
  '已结束': 2,
})

assert.equal(nextStatusFilter('', '待安排'), '待安排')
assert.equal(nextStatusFilter('待安排', '待安排'), '')
assert.equal(nextStatusFilter('已排期', '已结束'), '已结束')

console.log('live session status tests passed')
