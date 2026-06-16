import assert from 'node:assert/strict';
import {
  buildPlanConfirmationPatch,
  buildPlanItemUpdatePatch,
  buildPlanScriptDraft,
  isPlannableLiveStatus,
} from './anchorProductPlanningService';

assert.equal(isPlannableLiveStatus('已排期'), true);
assert.equal(isPlannableLiveStatus('待安排'), true);
assert.equal(isPlannableLiveStatus(''), true);
assert.equal(isPlannableLiveStatus('进行中'), false);
assert.equal(isPlannableLiveStatus('已结束'), false);

const patch = buildPlanConfirmationPatch();
assert.equal(patch.plan.plan_status, '已确认');
assert.equal(patch.liveSession.live_status, '已排期');
assert.ok(patch.plan.updated_time instanceof Date);

const updatePatch = buildPlanItemUpdatePatch([
  { item_id: 'LPI001', sort_order: 2, plan_role: '辅推', suggested_minutes: 9, target_gmv: 12000, target_orders: 80, plan_reason: '加强转化', risk_notes: '库存偏紧' },
  { item_id: 'LPI002', sort_order: 1, plan_role: '主推', suggested_minutes: 16, target_gmv: 36000, target_orders: 180, plan_reason: '作为爆款承接流量', risk_notes: '' },
]);
assert.deepEqual(updatePatch.summary, {
  target_gmv: 48000,
  target_orders: 260,
  total_planned_minutes: 25,
});
assert.equal(updatePatch.items[0].item_id, 'LPI002');
assert.equal(updatePatch.items[0].risk_notes, '暂无明显风险。');

const scriptDraft = buildPlanScriptDraft({
  live_title: '女装春季专场',
  anchor_name: '程鹿',
  product_name: '轻奢通勤连衣裙',
  plan_role: '主推',
  suggested_minutes: 12,
  plan_reason: '毛利高且主播品类匹配',
});
assert.equal(scriptDraft.script_type, '讲解');
assert.equal(scriptDraft.tags, '场次安排AI生成');
assert.match(scriptDraft.script_title, /女装春季专场/);
assert.match(scriptDraft.script_content, /程鹿/);
assert.match(scriptDraft.script_content, /轻奢通勤连衣裙/);

console.log('anchor product planning service tests passed');
