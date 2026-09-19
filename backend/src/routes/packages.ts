import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

// Get all packages
router.get('/', authMiddleware, async (req, res) => {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, packages });
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Create package
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { bundleId, name, displayName, iconUrl } = req.body;
    if (!bundleId || !name) {
      res.status(400).json({ error: 'Bundle ID and name required' });
      return;
    }
    const pkg = await prisma.package.create({
      data: { bundleId, name, displayName, iconUrl },
    });
    res.json({ success: true, package: pkg });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Update package
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { bundleId, name, displayName, iconUrl, isActive } = req.body;
    const pkg = await prisma.package.update({
      where: { id },
      data: { bundleId, name, displayName, iconUrl, isActive },
    });
    res.json({ success: true, package: pkg });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Delete package
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.package.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;