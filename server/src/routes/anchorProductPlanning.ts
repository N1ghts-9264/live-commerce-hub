import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  confirmLivePlan,
  createLivePlan,
  generateFitsForAnchor,
  generateFitsForProduct,
  getLivePlan,
  listAnchorProductFits,
} from '../services/anchorProductPlanningService';

const router = Router();
router.use(authenticate);

// GET /api/anchor-product-planning/fits
router.get('/fits', async (req: Request, res: Response) => {
  try {
    const fits = await listAnchorProductFits({
      anchorId: req.query.anchorId as string,
      productId: req.query.productId as string,
      category: req.query.category as string,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return res.json(fits);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/anchor-product-planning/fits/product/:productId
router.post('/fits/product/:productId', async (req: Request, res: Response) => {
  try {
    const fits = await generateFitsForProduct(req.params.productId, Number(req.body?.limit || 12));
    return res.status(201).json(fits);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/anchor-product-planning/fits/anchor/:anchorId
router.post('/fits/anchor/:anchorId', async (req: Request, res: Response) => {
  try {
    const fits = await generateFitsForAnchor(req.params.anchorId, Number(req.body?.limit || 24));
    return res.status(201).json(fits);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/anchor-product-planning/plans/:liveId
router.post('/plans/:liveId', async (req: Request, res: Response) => {
  try {
    const plan = await createLivePlan(req.params.liveId, req.body?.productIds);
    return res.status(201).json(plan);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/anchor-product-planning/plans/:id/confirm
router.post('/plans/:id/confirm', async (req: Request, res: Response) => {
  try {
    const plan = await confirmLivePlan(req.params.id);
    return res.json(plan);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/anchor-product-planning/plans/:id
router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const plan = await getLivePlan(req.params.id);
    if (!plan) return res.status(404).json({ message: '直播计划不存在' });
    return res.json(plan);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
