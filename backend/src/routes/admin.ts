import { Router } from 'express';
import ipWhitelistRoutes from './ipWhitelist';
import packagesRoutes from './packages';
import {
  loginHandler,
  refreshTokenHandler,
  getKeysHandler,
  createKeyHandler,
  updateKeyHandler,
  deleteKeyHandler,
  getKeyDevicesHandler,
  resetKeyDevicesHandler,
  getLogsHandler,
  getStatsHandler,
  setup2FAHandler,
  verify2FAHandler,
  disable2FAHandler,
  get2FAStatusHandler,
  createApiKeyHandler,
  listApiKeysHandler,
  deleteApiKeyHandler,
  convertTrialKeyHandler,
  generateOfflineKeyHandler,
  createCloneKeyHandler,
  renewKeyHandler,
  getExpiringKeysHandler,
  getPackagesHandler,
  createPackageHandler,
  updatePackageHandler,
  deletePackageHandler,
} from '../controllers/adminController';
import { authMiddleware } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimiter';
import {
  importKeysHandler,
  exportKeysHandler,
  exportKeysCsvHandler,
} from '../controllers/importExportController';
import prisma from '../prisma';

const router = Router();

router.post('/login', adminLimiter, loginHandler);
router.post('/refresh', refreshTokenHandler);

router.get('/2fa/status', authMiddleware, get2FAStatusHandler);
router.post('/2fa/setup', authMiddleware, setup2FAHandler);
router.post('/2fa/verify', authMiddleware, verify2FAHandler);
router.post('/2fa/disable', authMiddleware, disable2FAHandler);

router.post('/api-keys', authMiddleware, createApiKeyHandler);
router.get('/api-keys', authMiddleware, listApiKeysHandler);
router.delete('/api-keys/:keyId', authMiddleware, deleteApiKeyHandler);

router.get('/stats', authMiddleware, getStatsHandler);
router.get('/keys', authMiddleware, getKeysHandler);
router.post('/keys', authMiddleware, createKeyHandler);
router.patch('/keys/:id', authMiddleware, updateKeyHandler);
router.delete('/keys/:id', authMiddleware, deleteKeyHandler);
router.get('/keys/:id/devices', authMiddleware, getKeyDevicesHandler);
router.post('/keys/:id/reset', authMiddleware, resetKeyDevicesHandler);
router.post('/keys/:id/convert', authMiddleware, convertTrialKeyHandler);
router.post('/keys/:id/offline', authMiddleware, generateOfflineKeyHandler);
router.post('/keys/:id/clone', authMiddleware, createCloneKeyHandler);
router.post('/keys/:id/renew', authMiddleware, renewKeyHandler);
router.get('/keys/expiring', authMiddleware, getExpiringKeysHandler);
router.get('/logs', authMiddleware, getLogsHandler);
router.get('/packages', authMiddleware, getPackagesHandler);
router.post('/packages', authMiddleware, createPackageHandler);
router.patch('/packages/:id', authMiddleware, updatePackageHandler);
router.delete('/packages/:id', authMiddleware, deletePackageHandler);
router.post('/keys/import', authMiddleware, importKeysHandler);
router.get('/keys/export', authMiddleware, exportKeysHandler);
router.get('/keys/export/csv', authMiddleware, exportKeysCsvHandler);

// Audit logs
router.get('/audit', authMiddleware, async (req, res) => {
  const { page = 1, limit = 20, action, adminId } = req.query;
  const where: any = {};
  if (action) where.action = action;
  if (adminId) where.adminId = adminId;

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { timestamp: 'desc' },
        include: { admin: { select: { username: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total, page, limit, totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    console.error('Audit fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Usage stats
router.get('/usage', authMiddleware, async (req, res) => {
  const { days = 7 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Number(days));

  try {
    const stats = await prisma.usageStats.findMany({
      where: { date: { gte: startDate } },
      orderBy: { date: 'desc' },
      include: { key: { select: { keyValue: true, tier: true } } },
    });
    res.json(stats);
  } catch (error) {
    console.error('Usage fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

router.get('/keys/:id/usage', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { days = 7 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Number(days));

  try {
    const stats = await prisma.usageStats.findMany({
      where: { keyId: id, date: { gte: startDate } },
      orderBy: { date: 'desc' },
    });
    res.json(stats);
  } catch (error) {
    console.error('Key usage fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch key usage' });
  }
});

// IP Whitelist
router.use('/ip-whitelist', ipWhitelistRoutes);

// Packages
router.use('/packages', packagesRoutes);

export default router;