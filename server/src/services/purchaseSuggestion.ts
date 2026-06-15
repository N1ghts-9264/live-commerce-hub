import knex from '../db/knex';
import { buildInventoryPlans } from './inventoryPlanning';

export async function generateSuggestions() {
  // Same data source as inventory alerts: Inventory table (per warehouse)
  const lowStockItems = await knex('Inventory')
    .join('SKU', 'Inventory.sku_id', 'SKU.sku_id')
    .join('Product', 'SKU.product_id', 'Product.product_id')
    .leftJoin('Supplier', 'Product.supplier_id', 'Supplier.supplier_id')
    .select(
      'Inventory.inventory_id',
      'Inventory.sku_id',
      'Inventory.warehouse_name',
      'Inventory.current_stock',
      'Inventory.safety_stock',
      'SKU.product_id',
      'SKU.sku_name',
      'SKU.warning_threshold',
      'SKU.sales_volume',
      'Product.supplier_id',
      'Product.product_name',
      'Product.category',
      'Product.product_status',
      'Product.cost_price',
      'Supplier.supplier_name',
      'Supplier.delivery_cycle'
    )
    .where('SKU.sku_status', '在售')
    .where('Inventory.current_stock', '<=', knex.raw('Inventory.safety_stock'));

  const plannedItems = await buildInventoryPlans(lowStockItems);
  const suggestions = plannedItems.map((item: any) => ({
      inventory_id: item.inventory_id,
      sku_id: item.sku_id,
      sku_name: item.sku_name,
      product_name: item.product_name,
      category: item.category,
      warehouse_name: item.warehouse_name,
      current_stock: item.current_stock,
      safety_stock: item.safety_stock,
      warning_threshold: item.warning_threshold,
      predicted_sales: item.predicted_sales_30d,
      lead_time_demand: item.lead_time_demand,
      reorder_point: item.reorder_point,
      inbound_purchase_quantity: item.inbound_purchase_quantity,
      upcoming_live_demand: item.upcoming_live_demand,
      product_potential_score: item.product_potential_score,
      suggested_quantity: item.suggested_quantity,
      stock_risk_level: item.stock_risk_level,
      supplier_id: item.supplier_id || '',
      supplier_name: item.supplier_name || '',
      suggestion_reason: item.suggestion_reason,
  }));

  return suggestions.sort((a, b) => {
    const riskOrder: Record<string, number> = { '紧急': 0, '高': 1, '中': 2, '低': 3 };
    return (riskOrder[a.stock_risk_level] || 4) - (riskOrder[b.stock_risk_level] || 4);
  });
}
