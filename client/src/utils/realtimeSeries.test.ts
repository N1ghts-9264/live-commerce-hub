import assert from 'node:assert/strict'
import { appendRealtimePoint, secondsSince } from './realtimeSeries'

const initialLabels = ['10:00:00']
const initialOnline = [1200]
const initialGmv = [99]

const updated = appendRealtimePoint({
  labels: initialLabels,
  online: initialOnline,
  gmv: initialGmv,
  label: '10:00:02',
  onlineValue: 1438,
  gmvValue: 1892,
  maxPoints: 2,
})

assert.deepEqual(updated.labels, ['10:00:00', '10:00:02'])
assert.deepEqual(updated.online, [1200, 1438])
assert.deepEqual(updated.gmv, [99, 1892])
assert.notEqual(updated.labels, initialLabels, 'labels should use a new array reference for chart watchers')
assert.notEqual(updated.online, initialOnline, 'online data should use a new array reference for chart watchers')

const trimmed = appendRealtimePoint({
  labels: updated.labels,
  online: updated.online,
  gmv: updated.gmv,
  label: '10:00:04',
  onlineValue: 1501,
  gmvValue: 2100,
  maxPoints: 2,
})

assert.deepEqual(trimmed.labels, ['10:00:02', '10:00:04'])
assert.deepEqual(trimmed.online, [1438, 1501])
assert.equal(secondsSince(new Date('2026-06-14T10:00:00Z').getTime(), new Date('2026-06-14T10:00:05Z').getTime()), 5)

console.log('realtime series tests passed')
