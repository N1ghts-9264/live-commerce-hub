import { Router, Request, Response } from 'express';
import knex from '../db/knex';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function dateOnly(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function changeRate(current: number, previous: number) {
  if (!previous) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

async function getOrderReferenceDate() {
  const maxDate = await knex('[Order]').max('order_time as max').first();
  return maxDate?.max ? new Date(maxDate.max) : new Date();
}

// GET /api/dashboard/summary
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const endDate = await getOrderReferenceDate();
    const currentStart = addDays(endDate, -29);
    const previousStart = addDays(currentStart, -30);
    const nextEnd = addDays(endDate, 1);

    const currentOrders = await knex('[Order]')
      .where('order_time', '>=', currentStart)
      .where('order_time', '<', nextEnd)
      .sum('order_amount as total')
      .count('* as count')
      .first();
    const previousOrders = await knex('[Order]')
      .where('order_time', '>=', previousStart)
      .where('order_time', '<', currentStart)
      .sum('order_amount as total')
      .count('* as count')
      .first();
    const avgConv = await knex('AnchorPerformance')
      .where('evaluation_time', '>=', currentStart)
      .where('evaluation_time', '<', nextEnd)
      .avg('conversion_rate as avg')
      .first();
    const previousAvgConv = await knex('AnchorPerformance')
      .where('evaluation_time', '>=', previousStart)
      .where('evaluation_time', '<', currentStart)
      .avg('conversion_rate as avg')
      .first();
    const totalProducts = await knex('Product').where('product_status', '在售').count('* as count').first();
    const stockAlerts = await knex('Inventory').where('current_stock', '<=', knex.raw('safety_stock')).count('* as count').first();

    const totalGmv = Number(currentOrders?.total) || 0;
    const totalOrders = Number(currentOrders?.count) || 0;
    const avgConversionRate = Number(avgConv?.avg) || 0;

    return res.json({
      totalGmv,
      totalOrders,
      avgConversionRate,
      totalProducts: Number(totalProducts?.count) || 0,
      stockAlertCount: Number(stockAlerts?.count) || 0,
      gmvChange: changeRate(totalGmv, Number(previousOrders?.total) || 0),
      ordersChange: changeRate(totalOrders, Number(previousOrders?.count) || 0),
      conversionChange: changeRate(avgConversionRate, Number(previousAvgConv?.avg) || 0),
      period: {
        label: '近30天',
        startDate: dateOnly(currentStart),
        endDate: dateOnly(endDate),
        compareLabel: '较前30天',
        stockSnapshotLabel: '库存为当前快照',
      },
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
      .where('order_time', '>=', knex.raw(`DATEADD(DAY, -${days - 1}, CAST('${refStr}' AS DATE))`))
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
    const days = parseInt(req.query.days as string) || 30;
    const refDate = await getOrderReferenceDate();
    const startDate = addDays(refDate, -(days - 1));
    const nextEnd = addDays(refDate, 1);
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
      .where('LiveSession.start_time', '>=', startDate)
      .where('LiveSession.start_time', '<', nextEnd)
      .groupBy('Anchor.anchor_id', 'Anchor.anchor_name', 'Anchor.specialization', 'Anchor.anchor_level', 'Anchor.fan_count')
      .orderBy('total_gmv', 'desc')
      .limit(limit);

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
