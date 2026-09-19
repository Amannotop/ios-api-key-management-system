import crypto from 'crypto';
import prisma from '../prisma';
import { config } from '../config';

// Generate an offline license for a specific device
export async function generateOfflineLicense(
  keyId: string,
  udid: string,
  bundleId: string
): Promise<{ licenseData: string; expiresAt: Date } | null> {
  const licenseKey = await prisma.licenseKey.findUnique({
    where: { id: keyId },
  });

  if (!licenseKey || licenseKey.status !== 'active') {
    return null;
  }

  // Check expiry
  if (new Date() > licenseKey.expiresAt) {
    return null;
  }

  // Check if device already registered
  const existingDevice = await prisma.device.findFirst({
    where: {
      keyId: keyId,
      udid: udid,
    },
  });

  // Count devices for this key
  const deviceCount = await prisma.device.count({
    where: { keyId: keyId },
  });

  if (!existingDevice && deviceCount >= licenseKey.maxDevices) {
    return null;
  }

  // Create offline license payload
  const payload = {
    keyId: licenseKey.id,
    keyValue: licenseKey.keyValue,
    udid,
    bundleId,
    tier: licenseKey.tier,
    maxDevices: licenseKey.maxDevices,
    issuedAt: new Date().toISOString(),
    expiresAt: licenseKey.expiresAt.toISOString(),
    isTrial: licenseKey.isTrial,
    trialExpiresAt: licenseKey.trialExpiresAt?.toISOString() || null,
  };

  // Sign the payload with HMAC
  const signature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  const licenseData = Buffer.from(
    JSON.stringify({ ...payload, signature })
  ).toString('base64');

  return {
    licenseData,
    expiresAt: licenseKey.expiresAt,
  };
}

// Validate an offline license locally (for client-side validation)
export function validateOfflineLicense(
  licenseData: string,
  currentUdid: string,
  currentBundleId: string
): { valid: boolean; reason?: string; data?: any } {
  try {
    const decoded = JSON.parse(Buffer.from(licenseData, 'base64').toString());

    // Check expiry
    if (new Date() > new Date(decoded.expiresAt)) {
      return { valid: false, reason: 'License expired' };
    }

    // Check UDID matches
    if (decoded.udid !== currentUdid) {
      return { valid: false, reason: 'Device mismatch' };
    }

    // Check bundle ID
    if (decoded.bundleId !== currentBundleId) {
      return { valid: false, reason: 'Application mismatch' };
    }

    // Verify signature
    const { signature, ...payload } = decoded;
    const expectedSignature = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, reason: 'Invalid license signature' };
    }

    return { valid: true, data: decoded };
  } catch {
    return { valid: false, reason: 'Invalid license format' };
  }
}

// Check if a key supports offline activation
export async function canUseOfflineMode(keyId: string): Promise<boolean> {
  const licenseKey = await prisma.licenseKey.findUnique({
    where: { id: keyId },
  });

  return licenseKey?.status === 'active' && new Date() <= licenseKey.expiresAt;
}