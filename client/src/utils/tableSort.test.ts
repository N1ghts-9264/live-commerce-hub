import assert from 'node:assert/strict'
import { getValueByPath, sortRows } from './tableSort'

const rows = [
  { name: 'A', score: 68, start_time: '2026-06-14T10:00:00.000Z', nested: { gmv: 1200 } },
  { name: 'C', score: 91, start_time: '2026-06-16T10:00:00.000Z', nested: { gmv: 800 } },
  { name: 'B', score: 74, start_time: '2026-06-15T10:00:00.000Z', nested: { gmv: 2100 } },
]

assert.equal(getValueByPath(rows[0], 'nested.gmv'), 1200)
assert.deepEqual(sortRows(rows, { key: 'score', direction: 'desc' }).map((r) => r.name), ['C', 'B', 'A'])
assert.deepEqual(sortRows(rows, { key: 'start_time', direction: 'desc' }).map((r) => r.name), ['C', 'B', 'A'])
assert.deepEqual(sortRows(rows, { key: 'nested.gmv', direction: 'desc' }).map((r) => r.name), ['B', 'A', 'C'])
assert.deepEqual(sortRows(rows, { key: 'name', direction: 'asc' }).map((r) => r.name), ['A', 'B', 'C'])

console.log('table sort tests passed')
