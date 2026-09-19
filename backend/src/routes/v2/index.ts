import { Router } from 'express';
import { checkHandlerV2 } from './checkController';
import { checkLimiter } from '../../middleware/rateLimiter';
import { createSignatureMiddleware } from '../../services/signatureService';
import { antiCrackMiddleware } from '../../middleware/antiCrack';

const router = Router();

router.use(antiCrackMiddleware);
router.use(createSignatureMiddleware());
router.get('/check', checkLimiter, checkHandlerV2);

export default router;
