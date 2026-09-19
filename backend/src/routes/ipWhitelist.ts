import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

// Get all IPs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const ips = await prisma.ipWhitelist.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, ips });
  } catch (error) {
    console.error('Get IP whitelist error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Add IP
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { ip, description } = req.body;
    if (!ip) {
      res.status(400).json({ error: 'IP address required' });
      return;
    }
    const entry = await prisma.ipWhitelist.create({
      data: { ip, description },
    });
    res.json({ success: true, ip: entry });
  } catch (error) {
    console.error('Add IP error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Delete IP
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.ipWhitelist.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete IP error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;