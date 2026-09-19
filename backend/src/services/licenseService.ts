import prisma from '../prisma';
import { generateLicenseKey } from '../utils/keyGenerator';
import { KeyStatus, LogStatus } from '@prisma/client';
import { webhookService } from './webhookService';

export interface CheckResult {
  status: 'true' | 'false';
  uuid?: string;
  end_time?: string;
  reason?: string;
  tier?: string;
  trialRemaining?: number;
}

// Tier configurations
export const TIER_FEATURES = {
  basic: { maxDevices: 1, rateLimit: 100, analytics: false },
  pro: { maxDevices: 3, rateLimit: 500, analytics: true },
  premium: { maxDevices: 10, rateLimit: 2000, analytics: true },
};

export function getTierFeatures(tier: string) {
  return TIER_FEATURES[tier as keyof typeof TIER_FEATURES] || TIER_FEATURES.basic;
}

export async function checkLicense(
  udid: string,
  key: string,
  bundleId: string,
  ipAddress?: string
): Promise<CheckResult> {
  const licenseKey = await prisma.licenseKey.findUnique({
    where: { keyValue: key },
  });

  if (!licenseKey) {
    await prisma.log.create({
      data: { key, udid, ipAddress, status: 'fail', reason: 'Invalid key' },
    });
    return { status: 'false', reason: 'Invalid key' };
  }

  if (licenseKey.status === 'banned') {
    await prisma.log.create({
      data: { key, udid, ipAddress, status: 'fail', reason: 'Key banned' },
    });
    return { status: 'false', reason: 'Key banned' };
  }

  if (licenseKey.status === 'expired' || new Date() > licenseKey.expiresAt) {
    await prisma.log.create({
      data: { key, udid, ipAddress, status: 'fail', reason: 'Key expired' },
    });
    return { status: 'false', reason: 'Key expired' };
  }

  // Multi-tenant: Check if bundleId is allowed
  if (licenseKey.bundleIds && licenseKey.bundleIds.length > 0) {
    if (!licenseKey.bundleIds.includes(bundleId)) {
      await prisma.log.create({
        data: { key, udid, ipAddress, status: 'fail', reason: 'Bundle ID not allowed' },
      });
      return { status: 'false', reason: 'Bundle ID not allowed' };
    }
  }

  // IP Whitelist check
  if (licenseKey.allowedIPs && licenseKey.allowedIPs.length > 0) {
    if (!ipAddress || !licenseKey.allowedIPs.includes(ipAddress)) {
      await prisma.log.create({
        data: { key, udid, ipAddress, status: 'fail', reason: 'IP not allowed' },
      });
      return { status: 'false', reason: 'IP not allowed' };
    }
  }

  // Trial key handling
  if (licenseKey.isTrial) {
    const now = new Date();

    // Check if trial window is active (24h after first use)
    if (licenseKey.trialExpiresAt && licenseKey.trialExpiresAt > now) {
      // Trial window is active - check device count
      const trialDeviceCount = await prisma.device.count({
        where: { keyId: licenseKey.id },
      });

      // Only allow 1 device during trial window
      if (trialDeviceCount >= 1) {
        // Check if this is the same device logging in
        const existingDevice = await prisma.device.findUnique({
          where: { keyId_udid: { keyId: licenseKey.id, udid } },
        });

        if (!existingDevice) {
          await prisma.log.create({
            data: { key, udid, ipAddress, status: 'fail', reason: 'Trial device limit exceeded' },
          });
          return { status: 'false', reason: 'Trial device limit exceeded' };
        }

        // Same device - update last seen
        await prisma.device.update({
          where: { id: existingDevice.id },
          data: { lastSeen: now },
        });
      }
    } else if (licenseKey.trialExpiresAt && now > licenseKey.trialExpiresAt) {
      // Trial expired - convert to expired key
      await prisma.licenseKey.update({
        where: { id: licenseKey.id },
        data: { status: 'expired' },
      });
      await prisma.log.create({
        data: { key, udid, ipAddress, status: 'fail', reason: 'Trial expired' },
      });
      return { status: 'false', reason: 'Trial expired' };
    } else {
      // First use - set trial timer
      const trialDuration = 24 * 60 * 60 * 1000; // 24 hours
      await prisma.licenseKey.update({
        where: { id: licenseKey.id },
        data: {
          trialExpiresAt: new Date(Date.now() + trialDuration),
          maxDevices: getTierFeatures(licenseKey.tier).maxDevices,
        },
      });
    }
  }

  const deviceCount = await prisma.device.count({
    where: { keyId: licenseKey.id },
  });

  const tierFeatures = getTierFeatures(licenseKey.tier);
  const maxDevices = licenseKey.maxDevices || tierFeatures.maxDevices;

  if (deviceCount >= maxDevices) {
    await prisma.log.create({
      data: { key, udid, ipAddress, status: 'fail', reason: 'Device limit exceeded' },
    });
    return { status: 'false', reason: 'Device limit exceeded' };
  }

  let device = await prisma.device.findUnique({
    where: { keyId_udid: { keyId: licenseKey.id, udid } },
  });

  if (!device) {
    // Create new device and update usage stats
    device = await prisma.device.create({
      data: {
        keyId: licenseKey.id,
        udid,
        bundleId,
      },
    });

    // Update daily usage stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.usageStats.upsert({
      where: { keyId_date: { keyId: licenseKey.id, date: today } },
      update: {
        requestCount: { increment: 1 },
        uniqueDevices: { increment: 1 },
      },
      create: {
        keyId: licenseKey.id,
        date: today,
        requestCount: 1,
        uniqueDevices: 1,
      },
    });
  } else {
    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeen: new Date() },
    });
  }

  await prisma.log.create({
    data: { key, udid, ipAddress, status: 'success', reason: 'Valid license' },
  });

  const pad = (n: number) => n.toString().padStart(2, '0');
  const exp = licenseKey.expiresAt;
  const endTime = `${exp.getFullYear()}-${pad(exp.getMonth() + 1)}-${pad(exp.getDate())} ${pad(exp.getHours())}:${pad(exp.getMinutes())}:${pad(exp.getSeconds())}`;

  // Calculate trial time remaining if applicable
  let trialRemaining: number | undefined;
  if (licenseKey.isTrial && licenseKey.trialExpiresAt) {
    trialRemaining = Math.max(0, Math.floor((licenseKey.trialExpiresAt.getTime() - Date.now()) / (1000 * 60)));
  }

  return {
    status: 'true',
    uuid: udid,
    end_time: endTime,
    tier: licenseKey.tier,
    trialRemaining,
  };
}

export interface CreateKeyInput {
  expiresAt: Date;
  maxDevices: number;
  isTrial?: boolean;
  trialDurationHours?: number;
  tier?: string;
  allowedIPs?: string[];
  bundleIds?: string[];
}

export async function createLicenseKey(input: CreateKeyInput) {
  let keyValue = generateLicenseKey();
  let existing = await prisma.licenseKey.findUnique({ where: { keyValue } });

  while (existing) {
    keyValue = generateLicenseKey();
    existing = await prisma.licenseKey.findUnique({ where: { keyValue } });
  }

  // For trial keys, set trialExpiresAt based on trialDurationHours (will be overridden on first use)
  const trialExpiresAt = input.isTrial
    ? new Date(Date.now() + (input.trialDurationHours ?? 24) * 60 * 60 * 1000)
    : null;

  return prisma.licenseKey.create({
    data: {
      keyValue,
      expiresAt: input.expiresAt,
      maxDevices: input.maxDevices,
      status: 'active',
      isTrial: input.isTrial ?? false,
      trialExpiresAt,
      tier: input.tier ?? 'basic',
      allowedIPs: input.allowedIPs ?? [],
      bundleIds: input.bundleIds ?? [],
    },
  }).then(async (key) => {
    // Trigger webhook for key creation
    webhookService.send('key_created', {
      keyId: key.id,
      keyValue: key.keyValue,
      tier: key.tier,
      expiresAt: key.expiresAt.toISOString(),
    });
    return key;
  });
}

export async function getAllKeys(page = 1, limit = 20, search?: string, status?: KeyStatus, tier?: string) {
  const where: { keyValue?: { contains: string }; status?: KeyStatus; tier?: string } = {};

  if (search) {
    where.keyValue = { contains: search };
  }
  if (status) {
    where.status = status;
  }
  if (tier) {
    where.tier = tier;
  }

  const [keys, total] = await Promise.all([
    prisma.licenseKey.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { devices: true } } },
    }),
    prisma.licenseKey.count({ where }),
  ]);

  return {
    keys,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getKeyById(id: string) {
  return prisma.licenseKey.findUnique({
    where: { id },
    include: { devices: true },
  });
}

export async function updateKey(id: string, data: { expiresAt?: Date; maxDevices?: number; status?: KeyStatus; tier?: string; allowedIPs?: string[] }) {
  const oldKey = await prisma.licenseKey.findUnique({ where: { id } });
  const updated = await prisma.licenseKey.update({
    where: { id },
    data,
  });

  // Trigger webhook for status changes (banned/expired)
  if (oldKey && data.status && oldKey.status !== data.status) {
    webhookService.send('key_status_changed', {
      keyId: updated.id,
      keyValue: updated.keyValue,
      oldStatus: oldKey.status,
      newStatus: data.status,
    });
  }

  return updated;
}

export async function deleteKey(id: string) {
  return prisma.licenseKey.delete({ where: { id } });
}

export async function resetKeyDevices(id: string) {
  await prisma.device.deleteMany({ where: { keyId: id } });
  return prisma.licenseKey.findUnique({ where: { id } });
}

export async function getLogs(page = 1, limit = 20, search?: string, status?: LogStatus) {
  const where: { key?: { contains: string }; status?: LogStatus } = {};

  if (search) {
    where.key = { contains: search };
  }
  if (status) {
    where.status = status;
  }

  const [logs, total] = await Promise.all([
    prisma.log.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.log.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}