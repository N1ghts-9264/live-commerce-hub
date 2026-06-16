import assert from 'node:assert/strict'
import { countLiveSessionStatuses, nextStatusFilter } from './liveSessionStatus'

const sessions = [
  { live_status: '进行中' },
  { live_status: '进行中' },
  { live_status: '已排期' },
  { live_status: '已结束' },
  { live_status: '已结束' },
]

assert.deepEqual(countLiveSessionStatuses(sessions), {
  '进行中': 2,
  '已排期': 1,
  '已结束': 2,
})

assert.equal(nextStatusFilter('', '进行中'), '进行中')
assert.equal(nextStatusFilter('进行中', '进行中'), '')
assert.equal(nextStatusFilter('已排期', '已结束'), '已结束')

console.log('live session status tests passed')
