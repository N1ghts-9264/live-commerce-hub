import { Router, Request, Response } from 'express';
import knex from '../db/knex';
import { authenticate } from '../middleware/auth';
import { buildInventoryPlans } from '../services/inventoryPlanning';

const router = Router();
router.use(authenticate);

// GET /api/inventory
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const warehouse = req.query.warehouse as string || '';
    const status = req.query.status as string || '';

    let query = knex('Inventory')
      .join('SKU', 'Inventory.sku_id', 'SKU.sku_id')
      .join('Product', 'SKU.product_id', 'Product.product_id')
      .select(
        'Inventory.*',
        'SKU.product_id',
        'SKU.sku_name',
        'SKU.color',
        'SKU.size',
        'SKU.warning_threshold',
        'SKU.sales_volume',
        'Product.product_name',
        'Product.category',
        'Product.product_status',
        'Product.cost_price',
        'Product.supplier_id',
        'Supplier.supplier_name',
        'Supplier.delivery_cycle'
      );
    query = query.leftJoin('Supplier', 'Product.supplier_id', 'Supplier.supplier_id');

    if (warehouse) query = query.where('Inventory.warehouse_name', warehouse);
    if (status === '不足') query = query.where('Inventory.current_stock', '<=', knex.raw('Inventory.safety_stock'));
    else if (status === '正常') query = query.where('Inventory.current_stock', '>', knex.raw('Inventory.safety_stock'));

    const [{ count: total }] = await query.clone().clearSelect().count('* as count');
    const rows = await query
      .orderBy('Inventory.last_update_time', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);
    const data = await buildInventoryPlans(rows);

    return res.json({ data, total: Number(total), page, pageSize });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/inventory/alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const base = knex('Inventory')
      .join('SKU', 'Inventory.sku_id', 'SKU.sku_id')
      .join('Product', 'SKU.product_id', 'Product.product_id')
      .select(
        'Inventory.*',
        'SKU.product_id',
        'SKU.sku_name',
        'SKU.stock_quantity as sku_stock',
        'SKU.warning_threshold',
        'SKU.sales_volume',
        'Product.product_name',
        'Product.category',
        'Product.product_status',
        'Product.cost_price',
        'Product.supplier_id',
        'Supplier.supplier_name',
        'Supplier.delivery_cycle'
      )
      .leftJoin('Supplier', 'Product.supplier_id', 'Supplier.supplier_id')
      .where('Inventory.current_stock', '<=', knex.raw('Inventory.safety_stock'));

    const [{ count: total }] = await base.clone().clearSelect().count('* as count');

    const rows = await base
      .orderBy('Inventory.current_stock', 'asc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);
    const data = await buildInventoryPlans(rows);

    return res.json({ data, total: Number(total), page, pageSize });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/inventory/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    await knex('Inventory').where('inventory_id', req.params.id).update({
      ...req.body,
      last_update_time: new Date(),
    });
    const record = await knex('Inventory').where('inventory_id', req.params.id).first();
    return res.json(record);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
