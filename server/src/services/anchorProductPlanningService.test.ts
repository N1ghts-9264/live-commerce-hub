import assert from 'node:assert/strict';
import { buildPlanConfirmationPatch, isPlannableLiveStatus } from './anchorProductPlanningService';

assert.equal(isPlannableLiveStatus('已排期'), true);
assert.equal(isPlannableLiveStatus('待安排'), true);
assert.equal(isPlannableLiveStatus(''), true);
assert.equal(isPlannableLiveStatus('进行中'), false);
assert.equal(isPlannableLiveStatus('已结束'), false);

const patch = buildPlanConfirmationPatch();
assert.equal(patch.plan.plan_status, '已确认');
assert.equal(patch.liveSession.live_status, '已排期');
assert.ok(patch.plan.updated_time instanceof Date);

console.log('anchor product planning service tests passed');
