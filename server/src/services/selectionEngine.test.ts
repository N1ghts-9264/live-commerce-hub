import assert from 'node:assert/strict';
import {
  calculateExplorationBoost,
  calculateTrendScore,
  buildAdvisorReportSections,
  getTrendLabel,
  isColdStartProduct,
  resolveColdStartDecision,
  type TrendMetricRow,
} from './selectionEngine';

const risingRows: TrendMetricRow[] = [
  { period: 'previous', sales_volume: 100, gmv: 12000, conversion_rate: 2.5, interaction_heat: 40 },
  { period: 'recent', sales_volume: 180, gmv: 28000, conversion_rate: 4.2, interaction_heat: 85 },
];

const fallingRows: TrendMetricRow[] = [
  { period: 'previous', sales_volume: 180, gmv: 28000, conversion_rate: 4.2, interaction_heat: 85 },
  { period: 'recent', sales_volume: 80, gmv: 9000, conversion_rate: 1.6, interaction_heat: 30 },
];

const risingA = calculateTrendScore(risingRows);
const risingB = calculateTrendScore(risingRows);
assert.equal(risingA, risingB, 'trend score should be deterministic for the same history');
assert.ok(risingA > 75, `expected rising score above 75, got ${risingA}`);
assert.equal(getTrendLabel(risingA), '上升 ↗');

const falling = calculateTrendScore(fallingRows);
assert.ok(falling < 45, `expected falling score below 45, got ${falling}`);
assert.equal(getTrendLabel(falling), '下降 ↘');

assert.equal(calculateTrendScore([]), 60, 'missing history should use a stable neutral fallback');

assert.equal(calculateExplorationBoost(0), 20, 'first cold-start day should get the full exploration boost');
assert.ok(
  calculateExplorationBoost(3) < calculateExplorationBoost(0),
  'exploration boost should decay after trial exposure'
);
assert.equal(calculateExplorationBoost(14), 0, 'mature products should stop receiving exploration boost');

const strongDecision = resolveColdStartDecision(82, 18, 5);
assert.equal(strongDecision.action, '加码试播');
assert.equal(strongDecision.confidence, 'medium');

const weakDecision = resolveColdStartDecision(48, 4, 0);
assert.equal(weakDecision.action, '暂缓投放');
assert.equal(weakDecision.confidence, 'low');

assert.equal(isColdStartProduct({ product_status: '待评估' }), true);
assert.equal(isColdStartProduct({ product_status: '在售' }), false);

const advisorSections = buildAdvisorReportSections([
  {
    product_id: 'P1',
    product_name: '新品A',
    category: '美妆',
    product_status: '待评估',
    sale_price: 199,
    gross_profit_rate: 42,
    scores: { composite: 78, conversion: 60, profitability: 85, heat: 45, trend: 70, quality: 80 },
  },
  {
    product_id: 'P2',
    product_name: '强势老品',
    category: '美妆',
    product_status: '在售',
    sale_price: 129,
    gross_profit_rate: 38,
    scores: { composite: 91, conversion: 90, profitability: 82, heat: 88, trend: 80, quality: 89 },
  },
  {
    product_id: 'P3',
    product_name: '低分商品',
    category: '数码',
    product_status: '在售',
    sale_price: 299,
    gross_profit_rate: 18,
    scores: { composite: 45, conversion: 42, profitability: 35, heat: 40, trend: 44, quality: 60 },
  },
] as any[]);
assert.ok(advisorSections.executiveSummary.length > 0, 'advisor report should have an executive summary');
assert.equal(advisorSections.coldStartCandidates[0].product_name, '新品A');
assert.equal(advisorSections.actionItems.length, 3);

console.log('selectionEngine trend tests passed');
process.exit(0);
