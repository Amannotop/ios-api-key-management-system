import { Request, Response } from 'express';
import { checkLicense } from '../../services/licenseService';
import { rateLimitService } from '../../services/rateLimitService';
import { signatureService, SignatureParams } from '../../services/signatureService';
import { z } from 'zod';
import prisma from '../../prisma';

interface CustomRequest extends Request {
  signatureParams?: SignatureParams;
}

const checkSchema = z.object({
  udid: z.string().min(1),
  key: z.string().min(1),
  lockdevice: z.string().min(1),
});

export async function checkHandlerV2(req: CustomRequest, res: Response): Promise<void> {
  const result = checkSchema.safeParse(req.query);

  if (!result.success) {
    res.status(400).json({ 
      success: false,
      error: 'INVALID_PARAMETERS',
      message: 'Missing required parameters: udid, key, lockdevice'
    });
    return;
  }

  const { udid, key, lockdevice } = result.data;
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

  if (req.signatureParams) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyId: req.signatureParams.keyId },
    });

    if (apiKey && apiKey.hashedKey) {
      const secret = apiKey.hashedKey;
      const isValid = signatureService.verifySignature(secret, req.headers['x-api-signature'] as string, req.signatureParams);
      
      if (!isValid) {
        res.status(401).json({
          success: false,
          error: 'INVALID_SIGNATURE',
          message: 'Request signature verification failed'
        });
        return;
      }
    }
  }

  try {
    const keyData = await prisma.licenseKey.findUnique({
      where: { keyValue: key },
    });

    if (keyData && keyData.allowedIPs && keyData.allowedIPs.length > 0) {
      if (!keyData.allowedIPs.includes(ipAddress)) {
        res.status(403).json({
          success: false,
          error: 'IP_NOT_ALLOWED',
          message: 'This IP address is not allowed for this key'
        });
        return;
      }
    }

    if (keyData) {
      const rateLimitCheck = await rateLimitService.check(key, keyData.rateLimit || 100);
      
      res.setHeader('X-RateLimit-Limit', keyData.rateLimit || 100);
      res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitCheck.resetAt.toISOString());

      if (!rateLimitCheck.allowed) {
        res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: Math.ceil((rateLimitCheck.resetAt.getTime() - Date.now()) / 1000)
        });
        return;
      }
    }

    const checkResult = await checkLicense(udid, key, lockdevice, ipAddress);

    if (checkResult.status === 'true') {
      const usage = keyData ? await rateLimitService.getUsage(key, keyData.rateLimit || 100) : null;

      res.json({
        success: true,
        valid: true,
        uuid: checkResult.uuid,
        expiresAt: checkResult.end_time,
        tier: keyData?.tier || 'basic',
        usage: usage ? {
          used: usage.used,
          limit: usage.limit,
          percentage: Math.round(usage.percentage)
        } : null
      });
    } else {
      res.json({ 
        success: true,
        valid: false,
        reason: checkResult.reason || 'INVALID_LICENSE'
      });
    }
  } catch (error) {
    console.error('Check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    });
  }
}
