import { Request, Response } from 'express';
import prisma from '../prisma';
import { generateLicenseKey } from '../utils/keyGenerator';
import { KeyStatus } from '@prisma/client';
import { z } from 'zod';

const importSchema = z.object({
  keys: z.array(z.object({
    keyValue: z.string().optional(),
    expiresAt: z.string(),
    maxDevices: z.number().optional(),
    tier: z.string().optional(),
    bundleIds: z.array(z.string()).optional(),
    allowedIPs: z.array(z.string()).optional(),
  })),
});

// Import keys from CSV/JSON
export async function importKeysHandler(req: Request, res: Response): Promise<void> {
  const result = importSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: 'Invalid input format' });
    return;
  }

  const { keys } = result.data;
  const imported: { keyValue: string; status: string; error?: string }[] = [];
  const errors: string[] = [];

  try {
    for (const keyData of keys) {
      try {
        // Generate key if not provided
        let keyValue = keyData.keyValue;
        if (!keyValue) {
          keyValue = generateLicenseKey();
        }

        // Check if key already exists
        const existing = await prisma.licenseKey.findUnique({
          where: { keyValue },
        });

        if (existing) {
          imported.push({ keyValue, status: 'skipped', error: 'Key already exists' });
          continue;
        }

        const key = await prisma.licenseKey.create({
          data: {
            keyValue,
            expiresAt: new Date(keyData.expiresAt),
            maxDevices: keyData.maxDevices || 1,
            tier: keyData.tier || 'basic',
            status: 'active',
            bundleIds: keyData.bundleIds || [],
            allowedIPs: keyData.allowedIPs || [],
          },
        });

        imported.push({ keyValue: key.keyValue, status: 'imported' });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(errorMsg);
        imported.push({
          keyValue: keyData.keyValue || 'unknown',
          status: 'error',
          error: errorMsg,
        });
      }
    }

    // Log import
    await prisma.keyImport.create({
      data: {
        fileName: `import_${Date.now()}.json`,
        keysImported: imported.filter(k => k.status === 'imported').length,
        status: errors.length > 0 ? 'partial' : 'success',
        errors: errors.length > 0 ? errors.join('; ') : null,
      },
    });

    res.json({
      total: keys.length,
      imported: imported.filter(k => k.status === 'imported').length,
      skipped: imported.filter(k => k.status === 'skipped').length,
      errors: errors.length,
      keys: imported,
    });
  } catch (error) {
    console.error('Import keys error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
}

// Export keys as JSON
export async function exportKeysHandler(req: Request, res: Response): Promise<void> {
  try {
    const { status, tier, search } = req.query;

    const where: { status?: KeyStatus; tier?: string; keyValue?: { contains: string } } = {};

    if (status) where.status = status as KeyStatus;
    if (tier) where.tier = tier as string;
    if (search) where.keyValue = { contains: search as string };

    const keys = await prisma.licenseKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        keyValue: true,
        expiresAt: true,
        status: true,
        maxDevices: true,
        tier: true,
        bundleIds: true,
        allowedIPs: true,
        isTrial: true,
        createdAt: true,
      },
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="keys_export_${Date.now()}.json"`);
    res.json(keys);
  } catch (error) {
    console.error('Export keys error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
}

// Export as CSV
export async function exportKeysCsvHandler(req: Request, res: Response): Promise<void> {
  try {
    const keys = await prisma.licenseKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        keyValue: true,
        expiresAt: true,
        status: true,
        maxDevices: true,
        tier: true,
        isTrial: true,
        createdAt: true,
      },
    });

    const headers = ['keyValue', 'expiresAt', 'status', 'maxDevices', 'tier', 'isTrial', 'createdAt'];
    const rows = keys.map(k => [
      k.keyValue,
      k.expiresAt.toISOString(),
      k.status,
      k.maxDevices.toString(),
      k.tier,
      k.isTrial.toString(),
      k.createdAt.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="keys_export_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
}

// Clone a key
export async function cloneKeyHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { count = 1 } = req.body;

  try {
    const original = await prisma.licenseKey.findUnique({
      where: { id },
    });

    if (!original) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    if (count > 100) {
      res.status(400).json({ error: 'Max 100 clones at once' });
      return;
    }

    const clones = [];
    for (let i = 0; i < count; i++) {
      const clone = await prisma.licenseKey.create({
        data: {
          keyValue: generateLicenseKey(),
          expiresAt: original.expiresAt,
          maxDevices: original.maxDevices,
          tier: original.tier,
          status: 'active',
          bundleIds: original.bundleIds,
          allowedIPs: original.allowedIPs,
          isTrial: false,
        },
      });
      clones.push(clone);
    }

    res.status(201).json({ count: clones.length, keys: clones });
  } catch (error) {
    console.error('Clone key error:', error);
    res.status(500).json({ error: 'Clone failed' });
  }
}

// Renew/extend key expiration
export async function renewKeyHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { expiresAt, extendDays } = req.body;

  try {
    const key = await prisma.licenseKey.findUnique({
      where: { id },
    });

    if (!key) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    let newExpiresAt: Date;
    if (expiresAt) {
      newExpiresAt = new Date(expiresAt);
    } else if (extendDays) {
      newExpiresAt = new Date(key.expiresAt.getTime() + extendDays * 24 * 60 * 60 * 1000);
    } else {
      // Default extend by 30 days
      newExpiresAt = new Date(key.expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.licenseKey.update({
      where: { id },
      data: {
        expiresAt: newExpiresAt,
        status: newExpiresAt > new Date() ? 'active' : 'expired',
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Renew key error:', error);
    res.status(500).json({ error: 'Renew failed' });
  }
}

// Get keys expiring soon
export async function getExpiringKeysHandler(req:Request, res: Response): Promise<void> {
  try {
    const { days = 7 } = req.query;

    const now = new Date();
    const future = new Date(now.getTime() + parseInt(days as string) * 24 * 60 * 60 * 1000);

    const keys = await prisma.licenseKey.findMany({
      where: {
        status: 'active',
        expiresAt: {
          gte: now,
          lte: future,
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    res.json({ keys, count: keys.length });
  } catch (error) {
    console.error('Get expiring keys error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}