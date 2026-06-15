import assert from 'node:assert/strict';
import {
  buildAnchorProductFit,
  buildLivePlanItems,
  type AnchorFitInput,
  type ProductFitInput,
} from './anchorProductFitEngine';

const product: ProductFitInput = {
  product_id: 'P100',
  product_name: '高转化降噪耳机',
  category: '数码',
  gross_profit_rate: 42,
  sale_price: 299,
  stock_quantity: 850,
  warning_threshold: 80,
  is_cold_start: false,
  avg_conversion_rate: 5.8,
  avg_refund_rate: 2.1,
  avg_interaction_heat: 82,
  total_gmv: 58000,
};

const specialist: AnchorFitInput = {
  anchor_id: 'A001',
  anchor_name: '宋岩',
  specialization: '数码',
  anchor_level: 'A',
  fan_count: 860000,
  avg_conversion_rate: 5.2,
  avg_interaction_rate: 8.4,
  avg_watch_time: 260,
  avg_script_score: 86,
  avg_performance_score: 88,
  category_gmv: 120000,
};

const generalist: AnchorFitInput = {
  anchor_id: 'A002',
  anchor_name: '泛品主播',
  specialization: '美妆',
  anchor_level: 'B',
  fan_count: 220000,
  avg_conversion_rate: 3.1,
  avg_interaction_rate: 5.2,
  avg_watch_time: 130,
  avg_script_score: 70,
  avg_performance_score: 68,
  category_gmv: 18000,
};

const specialistFit = buildAnchorProductFit(specialist, product);
const generalistFit = buildAnchorProductFit(generalist, product);

assert.equal(specialistFit.fit_level, 'A');
assert.equal(specialistFit.recommended_role, '主推');
assert.ok(specialistFit.fit_score > generalistFit.fit_score);
assert.ok(specialistFit.match_reason.includes('品类专长匹配'));
assert.equal(generalistFit.fit_level === 'C' || generalistFit.fit_level === 'B', true);

const coldStartProduct: ProductFitInput = {
  ...product,
  product_id: 'P101',
  product_name: '新品智能手表',
  is_cold_start: true,
  total_gmv: 0,
  avg_conversion_rate: 0,
  avg_interaction_heat: 0,
};

const coldFit = buildAnchorProductFit(specialist, coldStartProduct);
assert.equal(coldFit.recommended_role, '试播');
assert.ok(coldFit.risk_notes.includes('新品'));

const lowStockProduct: ProductFitInput = {
  ...product,
  stock_quantity: 45,
  warning_threshold: 80,
};
const lowStockFit = buildAnchorProductFit(specialist, lowStockProduct);
assert.ok(lowStockFit.risk_notes.includes('库存'));

const planItems = buildLivePlanItems([
  buildAnchorProductFit(specialist, product),
  buildAnchorProductFit(specialist, coldStartProduct),
  buildAnchorProductFit(specialist, { ...product, product_id: 'P102', product_name: '稳定补充款', total_gmv: 12000 }),
]);

assert.equal(planItems[0].plan_role, '主推');
assert.equal(planItems[0].sort_order, 1);
assert.ok(planItems[0].suggested_minutes >= 10);
assert.ok(planItems.some((item) => item.plan_role === '试播'));
assert.ok(planItems.every((item) => item.target_gmv > 0));

console.log('anchor product fit engine tests passed');
