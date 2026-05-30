import knex from '../db/knex';

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
      'SKU.sku_name',
      'SKU.warning_threshold',
      'SKU.sales_volume',
      'Product.supplier_id',
      'Product.product_name',
      'Product.category',
      'Supplier.supplier_name'
    )
    .where('SKU.sku_status', '在售')
    .where('Inventory.current_stock', '<=', knex.raw('Inventory.safety_stock'));

  const suggestions = lowStockItems.map((item: any) => {
    // Same prediction logic: daily avg sales * 30 days
    const dailyAvg = Math.max((item.sales_volume || 0) / 90, 1);
    const predictedSales = Math.round(dailyAvg * 30);
    const suggestedQty = Math.max(
      predictedSales - item.current_stock + item.safety_stock,
      item.safety_stock * 2
    );

    // Risk based on current_stock vs safety_stock ratio
    const ratio = item.safety_stock > 0 ? item.current_stock / item.safety_stock : 0;
    let riskLevel = '低';
    if (ratio <= 0.3) riskLevel = '紧急';
    else if (ratio <= 0.5) riskLevel = '高';
    else if (ratio <= 0.8) riskLevel = '中';

    return {
      inventory_id: item.inventory_id,
      sku_id: item.sku_id,
      sku_name: item.sku_name,
      product_name: item.product_name,
      category: item.category,
      warehouse_name: item.warehouse_name,
      current_stock: item.current_stock,
      safety_stock: item.safety_stock,
      warning_threshold: item.warning_threshold,
      predicted_sales: predictedSales,
      suggested_quantity: suggestedQty,
      stock_risk_level: riskLevel,
      supplier_id: item.supplier_id || '',
      supplier_name: item.supplier_name || '',
      suggestion_reason: `${item.warehouse_name || ''}当前库存${item.current_stock}件，低于安全库存${item.safety_stock}，预测30天销量${predictedSales}件，建议采购${suggestedQty}件`,
    };
  });

  return suggestions.sort((a, b) => {
    const riskOrder: Record<string, number> = { '紧急': 0, '高': 1, '中': 2, '低': 3 };
    return (riskOrder[a.stock_risk_level] || 4) - (riskOrder[b.stock_risk_level] || 4);
  });
}
