import assert from 'node:assert/strict';
import { calculateInventoryPlan, type InventoryPlanningInput } from './inventoryPlanning';

const base: InventoryPlanningInput = {
  currentStock: 70,
  safetyStock: 80,
  warningThreshold: 60,
  salesVolume90Days: 270,
  supplierDeliveryCycle: 7,
  inboundPurchaseQuantity: 0,
  upcomingLiveDemand: 0,
  productPotentialScore: 65,
  isColdStartCandidate: false,
};

const normal = calculateInventoryPlan(base);
assert.equal(normal.predictedSales30Days, 90);
assert.equal(normal.leadTimeDemand, 21);
assert.ok(normal.suggestedQuantity > 0, 'low stock below reorder point should produce a purchase quantity');
assert.ok(normal.riskReasons.some((reason) => reason.includes('补货点')), 'risk should explain reorder point pressure');

const liveCampaign = calculateInventoryPlan({
  ...base,
  upcomingLiveDemand: 180,
  productPotentialScore: 90,
});
assert.ok(liveCampaign.suggestedQuantity > normal.suggestedQuantity, 'upcoming live demand should increase purchase quantity');
assert.ok(liveCampaign.riskReasons.some((reason) => reason.includes('直播')), 'risk should mention live-session demand');
assert.ok(liveCampaign.riskReasons.some((reason) => reason.includes('爆款')), 'risk should mention high product potential');

const inboundCovered = calculateInventoryPlan({
  ...liveCampaign.source,
  inboundPurchaseQuantity: liveCampaign.suggestedQuantity + 300,
});
assert.equal(inboundCovered.suggestedQuantity, 0, 'in-transit purchase quantity should reduce recommended purchase');
assert.equal(inboundCovered.stockRiskLevel, '低');

const newProduct = calculateInventoryPlan({
  ...base,
  currentStock: 20,
  salesVolume90Days: 0,
  isColdStartCandidate: true,
});
assert.ok(newProduct.riskReasons.some((reason) => reason.includes('新品')), 'new-product trial stock should be explicit');
assert.ok(newProduct.suggestedQuantity >= 120, 'new products need enough inventory for trial sessions');

console.log('inventory planning tests passed');
