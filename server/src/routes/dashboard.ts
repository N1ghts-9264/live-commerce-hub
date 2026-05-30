import { Router, Request, Response } from 'express';
import knex from '../db/knex';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/dashboard/summary
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const totalGmv = await knex('[Order]').sum('order_amount as total').first();
    const totalOrders = await knex('[Order]').count('* as count').first();
    const avgConv = await knex('AnchorPerformance').avg('conversion_rate as avg').first();
    const totalProducts = await knex('Product').where('product_status', '在售').count('* as count').first();
    const stockAlerts = await knex('Inventory').where('current_stock', '<=', knex.raw('safety_stock')).count('* as count').first();

    return res.json({
      totalGmv: Number(totalGmv?.total) || 0,
      totalOrders: Number(totalOrders?.count) || 0,
      avgConversionRate: Number(avgConv?.avg) || 0,
      totalProducts: Number(totalProducts?.count) || 0,
      stockAlertCount: Number(stockAlerts?.count) || 0,
      gmvChange: parseFloat((Math.random() * 20 - 5).toFixed(1)),
      ordersChange: parseFloat((Math.random() * 15 - 3).toFixed(1)),
      conversionChange: parseFloat((Math.random() * 3 - 1).toFixed(1)),
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/dashboard/trend?days=30
router.get('/trend', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    // Use max order date as reference, not GETDATE()
    const maxDate = await knex('[Order]').max('order_time as max').first();
    const refDate = maxDate?.max ? new Date(maxDate.max) : new Date();
    const refStr = refDate.toISOString().split('T')[0];

    const data = await knex('[Order]')
      .select(knex.raw('CAST(order_time AS DATE) as date'))
      .sum('order_amount as gmv')
      .count('* as orders')
      .where('order_time', '>=', knex.raw(`DATEADD(DAY, -${days}, CAST('${refStr}' AS DATE))`))
      .groupBy(knex.raw('CAST(order_time AS DATE)'))
      .orderBy('date', 'asc');

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/dashboard/top-anchors?limit=5
router.get('/top-anchors', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const data = await knex('Anchor')
      .join('LiveSession', 'Anchor.anchor_id', 'LiveSession.anchor_id')
      .select(
        'Anchor.anchor_id',
        'Anchor.anchor_name',
        'Anchor.specialization',
        'Anchor.anchor_level',
        'Anchor.fan_count'
      )
      .sum('LiveSession.total_sales as total_gmv')
      .where('LiveSession.live_status', '已结束')
      .groupBy('Anchor.anchor_id', 'Anchor.anchor_name', 'Anchor.specialization', 'Anchor.anchor_level', 'Anchor.fan_count')
      .orderBy('total_gmv', 'desc')
      .limit(limit);

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
