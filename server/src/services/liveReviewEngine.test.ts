import assert from 'node:assert/strict';
import { buildLiveReviewAnalysis, type LiveReviewInput } from './liveReviewEngine';

const baseInput: LiveReviewInput = {
  session: {
    live_id: 'LIVE_REVIEW_001',
    live_title: '验收复盘专场',
    live_category: '数码',
    planned_gmv: 10000,
    planned_peak_online: 2000,
    planned_conversion_rate: 4,
    planned_duration_minutes: 120,
    actual_gmv: 9200,
    actual_peak_online: 1800,
    actual_duration_minutes: 110,
  },
  funnel: {
    exposure: 50000,
    viewers: 16000,
    productClicks: 3200,
    orders: 420,
    buyers: 380,
  },
  products: [
    {
      product_id: 'P1',
      product_name: '主推耳机',
      category: '数码',
      sales_volume: 260,
      gmv: 6200,
      click_rate: 8,
      conversion_rate: 6.2,
      refund_rate: 1.2,
      interaction_heat: 8.6,
    },
    {
      product_id: 'P2',
      product_name: '补充数据线',
      category: '数码',
      sales_volume: 110,
      gmv: 2100,
      click_rate: 5.2,
      conversion_rate: 3.7,
      refund_rate: 2.1,
      interaction_heat: 5.4,
    },
    {
      product_id: 'P3',
      product_name: '长尾保护壳',
      category: '数码',
      sales_volume: 20,
      gmv: 900,
      click_rate: 2.1,
      conversion_rate: 1.2,
      refund_rate: 5.5,
      interaction_heat: 2.2,
    },
  ],
  anchor: {
    anchor_id: 'A001',
    anchor_name: '程程',
    conversion_rate: 4.1,
    average_watch_time: 210,
    interaction_rate: 7.5,
    script_execution_score: 82,
    performance_score: 84,
  },
  interactions: {
    total: 1800,
    positive: 860,
    neutral: 780,
    negative: 160,
    purchaseIntent: 320,
  },
};

const analysis = buildLiveReviewAnalysis(baseInput);

assert.equal(analysis.core.gmvAchievement, 92);
assert.equal(analysis.core.trafficAchievement, 90);
assert.equal(analysis.core.durationAchievement, 91.67);
assert.equal(analysis.score.grade, 'B');
assert.ok(analysis.score.value >= 80 && analysis.score.value < 90);

assert.equal(analysis.funnel.viewRate, 32);
assert.equal(analysis.funnel.clickRate, 20);
assert.equal(analysis.funnel.orderConversionRate, 13.13);
assert.equal(analysis.funnel.buyerConversionRate, 11.88);

assert.equal(analysis.productContribution.topProducts[0].product_id, 'P1');
assert.equal(analysis.productContribution.topProducts[0].contributionRate, 67.39);
assert.equal(analysis.productContribution.longTailProducts[0].product_id, 'P3');

assert.ok(analysis.diagnosis.some((item) => item.dimension === '内容结构'));
assert.ok(analysis.suggestions.length >= 3);
assert.ok(analysis.summary.includes('B级'));

const weakTrafficInput: LiveReviewInput = {
  ...baseInput,
  session: {
    ...baseInput.session,
    actual_peak_online: 900,
  },
};

const weakTraffic = buildLiveReviewAnalysis(weakTrafficInput);
assert.equal(weakTraffic.score.grade, 'C');
assert.ok(weakTraffic.diagnosis.some((item) => item.dimension === '流量'));

console.log('live review engine tests passed');
