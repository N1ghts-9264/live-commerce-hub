import assert from 'node:assert/strict';
import { calculateTrendScore, getTrendLabel, type TrendMetricRow } from './selectionEngine';

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

console.log('selectionEngine trend tests passed');
process.exit(0);
