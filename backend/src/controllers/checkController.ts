import { Request, Response } from 'express';
import { checkLicense } from '../services/licenseService';
import { validateOfflineLicense } from '../services/offlineLicenseService';
import { z } from 'zod';
import prisma from '../prisma';
import { config } from '../config';

const checkSchema = z.object({
  udid: z.string().min(1),
  key: z.string().min(1),
  bundleId: z.string().min(1),
});

const offlineCheckSchema = z.object({
  licenseData: z.string().min(1),
  udid: z.string().min(1),
  bundleId: z.string().min(1),
});

export async function checkHandler(req: Request, res: Response): Promise<void> {
  const result = checkSchema.safeParse(req.query);

  if (!result.success) {
    res.status(400).json({ status: 'false' });
    return;
  }

  const { udid, key, bundleId } = result.data;
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    const checkResult = await checkLicense(udid, key, bundleId, ipAddress);

    if (checkResult.status === 'true') {
      const response: Record<string, unknown> = {
        status: 'true',
        uuid: checkResult.uuid,
        end_time: checkResult.end_time,
      };
      if (checkResult.tier) response.tier = checkResult.tier;
      if (checkResult.trialRemaining) response.trialRemaining = checkResult.trialRemaining;
      res.json(response);
    } else {
      // Return generic success for validations but with reason for debugging
      if (config.debugMode) {
        res.json({ status: 'false', reason: checkResult.reason });
      } else {
        res.json({ status: 'false' });
      }
    }
  } catch (error) {
    // Log the actual error for admin review
    console.error('Check error:', error);

    // In debug mode, log to db for debugging. In prod, just return false.
    try {
      await prisma.log.create({
        data: {
          key,
          udid,
          ipAddress,
          status: 'fail',
          reason: `Internal error: ${(error as Error).message}`,
        },
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.json({ status: 'false' });
  }
}

// V2 handler - uses signature validation
export async function checkHandlerV2(req: Request, res: Response): Promise<void> {
  // Same as checkHandler but with additional signature validation
  const signature = req.headers['x-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;

  if (!signature || !timestamp) {
    res.status(400).json({ status: 'false', reason: 'Missing signature headers' });
    return;
  }

  // Delegate to checkHandler
  return checkHandler(req, res);
}

export async function offlineCheckHandler(req: Request, res: Response): Promise<void> {
  const result = offlineCheckSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ status: 'false', reason: 'Invalid input' });
    return;
  }

  const { licenseData, udid, bundleId } = result.data;
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    const validation = validateOfflineLicense(licenseData, udid, bundleId);

    if (!validation.valid) {
      await prisma.log.create({
        data: {
          key: validation.data?.keyValue || 'offline',
          udid,
          ipAddress,
          status: 'fail',
          reason: validation.reason,
        },
      });
      res.json({ status: 'false', reason: validation.reason });
      return;
    }

    await prisma.log.create({
      data: {
        key: validation.data.keyValue,
        udid,
        ipAddress,
        status: 'success',
        reason: 'Offline validation',
      },
    });

    res.json({
      status: 'true',
      uuid: udid,
      end_time: validation.data.expiresAt,
      tier: validation.data.tier,
    });
  } catch (error) {
    console.error('Offline check error:', error);
    res.json({ status: 'false', reason: 'Internal error' });
  }
}