import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  generateLiveSessionReview,
  getLiveSessionReview,
  getReviewAnchorAnalysis,
  getReviewProductAnalysis,
  listLiveSessionReviews,
} from '../services/liveReviewService';

const router = Router();
router.use(authenticate);

// GET /api/live-reviews
router.get('/', async (_req: Request, res: Response) => {
  try {
    const reviews = await listLiveSessionReviews();
    return res.json(reviews);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/live-reviews/generate/:liveId
router.post('/generate/:liveId', async (req: Request, res: Response) => {
  try {
    const review = await generateLiveSessionReview(req.params.liveId);
    return res.status(201).json(review);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/live-reviews/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const review = await getLiveSessionReview(req.params.id);
    if (!review) return res.status(404).json({ message: '\u590d\u76d8\u4e0d\u5b58\u5728' });
    return res.json(review);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/live-reviews/:id/products
router.get('/:id/products', async (req: Request, res: Response) => {
  try {
    const analysis = await getReviewProductAnalysis(req.params.id);
    if (!analysis) return res.status(404).json({ message: '\u590d\u76d8\u4e0d\u5b58\u5728' });
    return res.json(analysis);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/live-reviews/:id/anchor
router.get('/:id/anchor', async (req: Request, res: Response) => {
  try {
    const analysis = await getReviewAnchorAnalysis(req.params.id);
    if (!analysis) return res.status(404).json({ message: '\u590d\u76d8\u4e0d\u5b58\u5728' });
    return res.json(analysis);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
