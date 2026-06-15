import assert from 'node:assert/strict';
import { buildSimulatorSnapshot, createWarmupSeries, type SimulatorSnapshotState } from './liveSimulator';

const now = new Date('2026-06-15T10:00:00Z').getTime();
const warm = createWarmupSeries(now, 120, 1600, 2600);
assert.equal(warm.labels.length, 6, 'warmup should produce six history labels');
assert.equal(warm.online.length, 6, 'warmup should produce six online points');
assert.equal(warm.gmv.length, 6, 'warmup should produce six gmv points');
assert.ok(warm.online[0] > 0, 'warmup online points should be non-zero');

const state: SimulatorSnapshotState = {
  online: 1800,
  totalOrders: 12,
  gmv: 2388,
  peakOnline: 2100,
  duration: 180,
  currentProduct: { product_name: '测试商品', price: 199 },
  recentOrders: [{ orderId: 'O1', amount: 199 }],
  recentChats: [{ id: 'C1', content: '有库存吗' }],
  sentiment: { positive: 50, neutral: 35, negative: 15 },
  onlineHistory: warm.online,
  gmvHistory: warm.gmv,
  timeLabels: warm.labels,
};

const snapshot = buildSimulatorSnapshot(state);
assert.equal(snapshot.metrics.online, 1800);
assert.equal(snapshot.orders.length, 1);
assert.equal(snapshot.chats.length, 1);
assert.ok(snapshot.currentProduct);
assert.equal(snapshot.currentProduct.product_name, '测试商品');
assert.equal(snapshot.series.online.length, 6);

console.log('live simulator snapshot tests passed');
