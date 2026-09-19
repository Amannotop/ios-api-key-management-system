import { Router } from 'express';
import { checkHandler } from '../../controllers/checkController';
import { checkLimiter } from '../../middleware/rateLimiter';
import { antiCrackMiddleware } from '../../middleware/antiCrack';

const router = Router();

// Anti-crack on all check routes
router.use(antiCrackMiddleware);

router.get('/check', checkLimiter, checkHandler);

export default router;
