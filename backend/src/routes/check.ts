import { Router } from 'express';
import { checkHandler, offlineCheckHandler } from '../controllers/checkController';
import { checkLimiter } from '../middleware/rateLimiter';
import { antiCrackMiddleware } from '../middleware/antiCrack';

const router = Router();

// Anti-crack on all check routes
router.use(antiCrackMiddleware);

// Check endpoint with device fingerprinting
router.get('/check', checkLimiter, checkHandler);
router.post('/offline-validate', checkLimiter, offlineCheckHandler);

export default router;