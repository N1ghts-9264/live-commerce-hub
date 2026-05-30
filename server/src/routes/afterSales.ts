import { Router, Request, Response } from 'express';
import knex from '../db/knex';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/after-sales
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string || '';

    let query = knex('AfterSale')
      .join('[Order]', 'AfterSale.order_id', '[Order].order_id')
      .join('User', '[Order].user_id', 'User.user_id')
      .select('AfterSale.*', '[Order].order_amount', 'User.nickname', 'User.user_id');

    if (status) query = query.where('AfterSale.process_status', status);

    const [{ count: total }] = await query.clone().clearSelect().count('* as count');
    const data = await query
      .orderBy('AfterSale.create_time', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return res.json({ data, total: Number(total), page, pageSize });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/after-sales/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    await knex('AfterSale').where('aftersale_id', req.params.id).update(req.body);
    const record = await knex('AfterSale').where('aftersale_id', req.params.id).first();
    return res.json(record);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
