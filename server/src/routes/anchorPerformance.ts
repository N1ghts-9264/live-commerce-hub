import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getAnchorPerformance, getAnchorRadarByAnchorId } from '../services/performance';

const router = Router();
router.use(authenticate);

// GET /api/anchor-performance
router.get('/', async (req: Request, res: Response) => {
  try {
    const anchorId = req.query.anchor_id as string || '';
    const liveId = req.query.live_id as string || '';
    const data = await getAnchorPerformance(anchorId, liveId);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/anchor-performance/:id/radar
router.get('/:id/radar', async (req: Request, res: Response) => {
  try {
    const radar = await getAnchorRadarByAnchorId(req.params.id);
    return res.json(radar);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
