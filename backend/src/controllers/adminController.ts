import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import prisma from '../prisma';
import { createLicenseKey, getAllKeys, getKeyById, updateKey, deleteKey, resetKeyDevices, getLogs } from '../services/licenseService';
import { generateOfflineLicense } from '../services/offlineLicenseService';
import { generateLicenseKey } from '../utils/keyGenerator';
import { KeyStatus } from '@prisma/client';
import { config } from '../config';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

function generateTokens(adminId: string, username: string) {
  const accessToken = jwt.sign(
    { adminId, username },
    config.jwtSecret,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { adminId, username, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const { username, password, totpCode } = result.data;

  try {
    const admin = await prisma.admin.findUnique({ where: { username } });

    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (admin.totpEnabled) {
      if (!totpCode) {
        res.status(200).json({ require2FA: true });
        return;
      }
      
      const verified = speakeasy.totp.verify({
        secret: admin.totpSecret!,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });

      if (!verified) {
        res.status(401).json({ error: 'Invalid 2FA code' });
        return;
      }
    }

    const { accessToken, refreshToken } = generateTokens(admin.id, admin.username);

    // Set refresh token as httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.json({
      accessToken,
      username: admin.username,
      expiresIn: 900
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function refreshTokenHandler(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as { 
      adminId: string; 
      username: string; 
      type: string 
    };

    if (decoded.type !== 'refresh') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.adminId, decoded.username);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      accessToken,
      expiresIn: 900
    });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function setup2FAHandler(req: Request, res: Response): Promise<void> {
  const { adminId } = (req as any);

  try {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }

    if (admin.totpEnabled) {
      res.status(400).json({ error: '2FA already enabled' });
      return;
    }

    const secret = speakeasy.generateSecret({ name: `LicenseKeyAdmin:${admin.username}` });
    
    await prisma.admin.update({
      where: { id: adminId },
      data: { totpSecret: secret.base32 },
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    res.json({ 
      secret: secret.base32, 
      qrCode: qrCodeUrl 
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function verify2FAHandler(req: Request, res: Response): Promise<void> {
  const { adminId } = (req as any);
  const { code } = req.body;

  try {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.totpSecret) {
      res.status(400).json({ error: '2FA not configured' });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: admin.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      res.status(400).json({ error: 'Invalid code' });
      return;
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: { totpEnabled: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function disable2FAHandler(req: Request, res: Response): Promise<void> {
  const { adminId } = (req as any);
  const { code } = req.body;

  try {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.totpSecret) {
      res.status(400).json({ error: '2FA not configured' });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: admin.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      res.status(400).json({ error: 'Invalid code' });
      return;
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: { totpEnabled: false, totpSecret: null },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function get2FAStatusHandler(req: Request, res: Response): Promise<void> {
  const { adminId } = (req as any);

  try {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }

    res.json({ enabled: admin.totpEnabled });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function createApiKeyHandler(req: Request, res: Response): Promise<void> {
  const { adminId } = (req as any);
  const { name, permissions } = req.body;

  try {
    const key = crypto.randomBytes(32).toString('hex');
    const keyId = crypto.randomBytes(8).toString('hex');
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

    await prisma.apiKey.create({
      data: {
        keyId: `lks_${keyId}`,
        hashedKey,
        name: name || `API Key ${new Date().toISOString()}`,
        permissions: permissions || ['read'],
        adminId,
      },
    });

    res.status(201).json({ 
      keyId: `lks_${keyId}`,
      apiKey: key,
      message: 'Store this key securely. It will not be shown again.' 
    });
  } catch (error) {
    console.error('API key create error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function listApiKeysHandler(req: Request, res: Response): Promise<void> {
  const { adminId } = (req as any);

  try {
    const keys = await prisma.apiKey.findMany({
      where: { adminId },
      select: {
        keyId: true,
        name: true,
        permissions: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    res.json(keys);
  } catch (error) {
    console.error('API key list error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function deleteApiKeyHandler(req: Request, res: Response): Promise<void> {
  const { adminId } = (req as any);
  const { keyId } = req.params;

  try {
    await prisma.apiKey.deleteMany({
      where: { keyId, adminId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('API key delete error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function getKeysHandler(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20', search, status, tier } = req.query;
    const result = await getAllKeys(
      parseInt(page as string, 10),
      parseInt(limit as string, 10),
      search as string,
      status as KeyStatus | undefined,
      tier as string | undefined
    );
    res.json(result);
  } catch (error) {
    console.error('Get keys error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function createKeyHandler(req: Request, res: Response): Promise<void> {
  try {
    const { expiresAt, maxDevices = 1, isTrial, trialDurationHours = 24, tier = 'basic', count = 1, allowedIPs, bundleIds } = req.body;

    const ipsArray = allowedIPs && Array.isArray(allowedIPs) ? allowedIPs : [];
    const bundlesArray = bundleIds && Array.isArray(bundleIds) ? bundleIds : [];

    // Bulk key generation
    if (count > 1 && count <= 1000) {
      const keys = [];
      for (let i = 0; i < count; i++) {
        const key = await createLicenseKey({
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxDevices,
          isTrial: isTrial || false,
          trialDurationHours: trialDurationHours || 24,
          tier: tier || 'basic',
          allowedIPs: ipsArray,
          bundleIds: bundlesArray,
        });
        keys.push(key);
      }
      res.status(201).json({ count: keys.length, keys });
      return;
    }

    if (!expiresAt && !isTrial) {
      res.status(400).json({ error: 'expiresAt is required for non-trial keys' });
      return;
    }

    const key = await createLicenseKey({
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxDevices,
      isTrial: isTrial || false,
      trialDurationHours: trialDurationHours || 24,
      tier: tier || 'basic',
      allowedIPs: ipsArray,
      bundleIds: bundlesArray,
    });

    res.status(201).json(key);
  } catch (error) {
    console.error('Create key error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function convertTrialKeyHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { expiresAt, maxDevices, tier } = req.body;

    const key = await prisma.licenseKey.findUnique({ where: { id } });

    if (!key) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    if (!key.isTrial) {
      res.status(400).json({ error: 'Key is not a trial key' });
      return;
    }

    const updated = await prisma.licenseKey.update({
      where: { id },
      data: {
        isTrial: false,
        trialExpiresAt: null,
        expiresAt: expiresAt ? new Date(expiresAt) : key.expiresAt,
        maxDevices: maxDevices ?? key.maxDevices,
        tier: tier ?? key.tier,
        status: 'active',
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Convert trial key error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function updateKeyHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { expiresAt, maxDevices, status, tier, allowedIPs } = req.body;

    const updateData: { expiresAt?: Date; maxDevices?: number; status?: KeyStatus; tier?: string; allowedIPs?: string[] } = {};

    if (expiresAt) updateData.expiresAt = new Date(expiresAt);
    if (maxDevices) updateData.maxDevices = maxDevices;
    if (status) updateData.status = status;
    if (tier) updateData.tier = tier;
    if (allowedIPs !== undefined) updateData.allowedIPs = allowedIPs;

    const key = await updateKey(id, updateData);
    res.json(key);
  } catch (error) {
    console.error('Update key error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function deleteKeyHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await deleteKey(id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete key error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function getKeyDevicesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const key = await getKeyById(id);

    if (!key) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    res.json(key.devices);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function resetKeyDevicesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await resetKeyDevices(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Reset devices error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function getLogsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20', search, status } = req.query;
    const result = await getLogs(
      parseInt(page as string, 10),
      parseInt(limit as string, 10),
      search as string,
      status as 'success' | 'fail' | undefined
    );
    res.json(result);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function getStatsHandler(req: Request, res: Response): Promise<void> {
  try {
    const [totalKeys, activeKeys, totalDevices, recentLogs] = await Promise.all([
      prisma.licenseKey.count(),
      prisma.licenseKey.count({ where: { status: 'active' } }),
      prisma.device.count(),
      prisma.log.count({ where: { timestamp: { gte: new Date(Date.now() - 3600000) } } }),
    ]);

    res.json({
      totalKeys,
      activeKeys,
      totalDevices,
      recentLogs,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function generateOfflineKeyHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { udid, bundleId } = req.body;

    if (!udid || !bundleId) {
      res.status(400).json({ error: 'udid and bundleId are required' });
      return;
    }

    const result = await generateOfflineLicense(id, udid, bundleId);

    if (!result) {
      res.status(400).json({ error: 'Cannot generate offline license' });
      return;
    }

    res.json({
      licenseData: result.licenseData,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('Generate offline key error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function createCloneKeyHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { count = 1 } = req.body;

  try {
    const original = await prisma.licenseKey.findUnique({ where: { id } });
    if (!original) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    const clones = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
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

export async function renewKeyHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { expiresAt, extendDays } = req.body;

  try {
    const key = await prisma.licenseKey.findUnique({ where: { id } });
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
      newExpiresAt = new Date(key.expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.licenseKey.update({
      where: { id },
      data: { expiresAt: newExpiresAt },
    });

    res.json(updated);
  } catch (error) {
    console.error('Renew key error:', error);
    res.status(500).json({ error: 'Renew failed' });
  }
}

export async function getExpiringKeysHandler(req: Request, res: Response): Promise<void> {
  const { days = 7 } = req.query;

  try {
    const now = new Date();
    const future = new Date(now.getTime() + parseInt(days as string) * 24 * 60 * 60 * 1000);

    const keys = await prisma.licenseKey.findMany({
      where: {
        status: 'active',
        expiresAt: { gte: now, lte: future },
      },
      orderBy: { expiresAt: 'asc' },
    });

    res.json({ keys, count: keys.length });
  } catch (error) {
    console.error('Get expiring keys error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function getPackagesHandler(req: Request, res: Response): Promise<void> {
  try {
    const packages = await prisma.package.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(packages);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function createPackageHandler(req: Request, res: Response): Promise<void> {
  const { name, bundleId, displayName, iconUrl } = req.body;

  try {
    const existing = await prisma.package.findUnique({ where: { bundleId } });
    if (existing) {
      res.status(400).json({ error: 'Bundle ID already registered' });
      return;
    }

    const pkg = await prisma.package.create({
      data: { name, bundleId, displayName, iconUrl },
    });

    res.status(201).json(pkg);
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function updatePackageHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, displayName, iconUrl, isActive } = req.body;

  try {
    const pkg = await prisma.package.update({
      where: { id },
      data: { ...(name && { name }), ...(displayName && { displayName }), ...(iconUrl && { iconUrl }), ...(typeof isActive === 'boolean' && { isActive }) },
    });

    res.json(pkg);
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: 'Package not found' });
  }
}

export async function deletePackageHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    await prisma.package.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: 'Package not found' });
  }
}