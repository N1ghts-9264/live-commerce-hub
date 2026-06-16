import assert from 'node:assert/strict';
import { buildResetSummary } from './systemReset';

const summary = buildResetSummary({
  liveSessions: [{ live_id: 'L1' }, { live_id: 'L2' }],
  products: [{ product_id: 'P1' }],
  anchors: [{ anchor_id: 'A1' }],
});

assert.equal(summary.success, true);
assert.equal(summary.message, '系统已恢复到验收初始数据');
assert.deepEqual(summary.counts, {
  liveSessions: 2,
  products: 1,
  anchors: 1,
});

console.log('system reset tests passed');
