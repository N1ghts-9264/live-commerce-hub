import assert from 'node:assert/strict';
import { buildAcceptancePreview } from './acceptanceSeed';

const preview = buildAcceptancePreview();

assert.ok(preview.suppliers.length >= 20, 'acceptance data should include supplier candidates');
assert.ok(preview.products.length >= 120, 'acceptance data should include a visible product pool');
assert.equal(preview.skus.length, preview.products.length * 3, 'each product should have three SKU variants');
assert.ok(preview.liveSessions.length >= 90, 'acceptance data should include enough live sessions for trend comparison');
assert.ok(preview.productPerformances.length >= preview.products.length * 4, 'products should have historical performance rows');
assert.ok(preview.userBehaviorStats.length >= 120, 'live behavior stats should support real-time time dimension acceptance');
assert.ok(preview.purchaseSuggestions.length >= 40, 'purchase suggestions should be available for procurement tests');
assert.ok(preview.interfaceLogs.length >= 80, 'platform interface logs should support platform data access tests');

const lowStockInventory = preview.inventory.filter((item) => item.current_stock <= item.safety_stock);
assert.ok(lowStockInventory.length >= 40, 'inventory should contain enough low-stock rows for generated procurement suggestions');

console.log('acceptance seed preview tests passed');
process.exit(0);
