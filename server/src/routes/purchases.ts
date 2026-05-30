import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import knex from '../db/knex';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/purchases
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string || '';

    let query = knex('PurchaseOrder')
      .join('Supplier', 'PurchaseOrder.supplier_id', 'Supplier.supplier_id')
      .join('SKU', 'PurchaseOrder.sku_id', 'SKU.sku_id')
      .join('Product', 'SKU.product_id', 'Product.product_id')
      .select(
        'PurchaseOrder.*',
        'Supplier.supplier_name',
        'SKU.sku_name',
        'Product.product_name'
      );

    if (status) query = query.where('PurchaseOrder.purchase_status', status);

    const [{ count: total }] = await query.clone().clearSelect().count('* as count');
    const data = await query
      .orderBy('PurchaseOrder.create_time', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return res.json({ data, total: Number(total), page, pageSize });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/purchases/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const purchase = await knex('PurchaseOrder')
      .join('Supplier', 'PurchaseOrder.supplier_id', 'Supplier.supplier_id')
      .join('SKU', 'PurchaseOrder.sku_id', 'SKU.sku_id')
      .select('PurchaseOrder.*', 'Supplier.supplier_name', 'SKU.sku_name')
      .where('PurchaseOrder.purchase_id', req.params.id)
      .first();
    if (!purchase) return res.status(404).json({ message: '采购单不存在' });
    return res.json(purchase);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/purchases
router.post('/', async (req: Request, res: Response) => {
  try {
    const id = uuid().replace(/-/g, '').substring(0, 16);
    const purchase = {
      purchase_id: id,
      ...req.body,
      create_time: new Date(),
    };
    await knex('PurchaseOrder').insert(purchase);
    return res.status(201).json(purchase);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/purchases/:id/status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const update: any = { purchase_status: status };
    if (status === '已入库') {
      update.actual_arrival_time = new Date();
      // Update inventory
      const purchase = await knex('PurchaseOrder').where('purchase_id', req.params.id).first();
      if (purchase) {
        const inventory = await knex('Inventory').where('sku_id', purchase.sku_id).first();
        if (inventory) {
          await knex('Inventory').where('inventory_id', inventory.inventory_id).update({
            current_stock: inventory.current_stock + purchase.purchase_quantity,
            inbound_quantity: inventory.inbound_quantity + purchase.purchase_quantity,
            last_update_time: new Date(),
          });
        }
      }
    }
    await knex('PurchaseOrder').where('purchase_id', req.params.id).update(update);
    const record = await knex('PurchaseOrder').where('purchase_id', req.params.id).first();
    return res.json(record);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// DELETE /api/purchases/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await knex('PurchaseOrder').where('purchase_id', req.params.id).del();
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
