import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import prisma from '../prisma';

// Generate fingerprint from request
function generateFingerprint(req: Request): string {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const accept = req.headers['accept'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const connection = req.headers['connection'] || '';
  const host = req.headers['host'] || '';

  // Create unique fingerprint
  const fp = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${ip}|${userAgent}|${accept}|${acceptLanguage}|${acceptEncoding}|${host}`)
    .digest('hex');

  return fp;
}

// Known automated tool signatures
const BOT_SIGNATURES = [
  'burp', 'burpsuite', ' Intruder', 'Repeater', 'Scanner',
  'curl', 'wget', 'lynx', 'links', 'elinks',
  'python', 'requests', 'urllib', 'httpx',
  'java', 'okhttp', 'apache', 'httpclient',
  'node', 'axios', 'got', 'node-fetch',
  'ruby', 'faraday', 'net-http',
  'php', 'guzzle', 'curl',
  'go', 'httpie',
  'playwright', 'puppeteer', 'selenium', 'chromium',
  'headless', 'chrome-headless',
  'zap', 'owasp', 'netsparker', 'acunetix',
  'sqlmap', 'nikto', 'nmap', 'masscan',
  'hydra', 'medusa', 'john',
  'bp', 'bp suite', 'browser',
  'autofill', 'automation',
  'python-requests', 'python urllib',
  'script', 'bot', 'crawler', 'spider',
];

// Suspicious patterns in headers - only block actual crack tools
const SUSPICIOUS_PATTERNS = [
  { pattern: /burp/i, name: 'Burp Suite' },
  { pattern: /headless.*chrome/i, name: 'Headless Chrome' },
  { pattern: /^naTLwS$/i, name: 'Encoded Header' }, // Common in Burp
  { pattern: /G.*C.*E.*H.*E/i, name: ' encoding' },
];

// Rate limiting for anti-crack
const MAX_REQUESTS_PER_MINUTE = 60;
const MAX_REQUESTS_PER_HOUR = 500;
const BLOCK_THRESHOLD = 1000; // Block after this many requests

export interface AntiCrackResult {
  allowed: boolean;
  reason?: string;
  fingerprint?: string;
}

export async function checkAntiCrack(req: Request): Promise<AntiCrackResult> {
  const fingerprint = generateFingerprint(req);
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Check if already blocked
  const existing = await prisma.apiProtection.findUnique({
    where: { fingerprint },
  });

  if (existing?.blocked) {
    return {
      allowed: false,
      reason: existing.blockedReason || 'Blocked by anti-crack system',
      fingerprint,
    };
  }

  // Check for bot signatures in user agent - only block most obvious automation tools
  const BLOCKLIST = ['burp', 'burpsuite', ' Intruder', 'Repeater', 'Scanner', 'zap', 'netsparker', 'acunetix', 'sqlmap', 'nikto', 'nmap', 'selenium', 'puppeteer', 'playwright'];
  const WARN_LIST = ['curl', 'wget', 'python', 'requests', 'okhttp', 'node', 'axios'];

  for (const sig of BLOCKLIST) {
    if (userAgent.includes(sig.toLowerCase())) {
      return {
        allowed: false,
        reason: `Automated tool detected: ${sig}`,
        fingerprint,
      };
    }
  }

  // For warn list, just log but don't block (allow admin tools)
  for (const sig of WARN_LIST) {
    if (userAgent.includes(sig.toLowerCase())) {
      await trackRequest(fingerprint, 'suspicious_user_agent');
      // Don't block - might be admin tools
      break;
    }
  }

  // Check suspicious patterns
  for (const { pattern, name } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(userAgent)) {
      await trackRequest(fingerprint, 'suspicious_pattern');
      return {
        allowed: false,
        reason: `Suspicious pattern detected: ${name}`,
        fingerprint,
      };
    }
  }

  // Check for missing common headers (automation indicator)
  const accept = req.headers['accept'];
  const acceptLanguage = req.headers['accept-language'];
  const referer = req.headers['referer'];

  // If all these are missing, likely automation
  if (!accept && !acceptLanguage) {
    await trackRequest(fingerprint, 'missing_headers');
  }

  // Check request rate
  if (existing && existing.requestCount > BLOCK_THRESHOLD) {
    await prisma.apiProtection.update({
      where: { fingerprint },
      data: {
        blocked: true,
        blockedReason: 'Exceeded request limit',
      },
    });
    return {
      allowed: false,
      reason: 'Exceeded request limit - blocked',
      fingerprint,
    };
  }

  // Track this request
  await trackRequest(fingerprint, 'normal');

  return { allowed: true, fingerprint };
}

async function trackRequest(fingerprint: string, type: string): Promise<void> {
  const now = new Date();

  await prisma.apiProtection.upsert({
    where: { fingerprint },
    create: {
      fingerprint,
      requestCount: 1,
      lastRequestAt: now,
    },
    update: {
      requestCount: { increment: 1 },
      lastRequestAt: now,
    },
  });
}

// Express middleware
export function antiCrackMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip for admin routes
  if (req.path.startsWith('/api/admin') && req.method === 'POST') {
    return next();
  }

  checkAntiCrack(req)
    .then((result) => {
      if (!result.allowed) {
        console.log(`Anti-crack blocked: ${result.reason} - IP: ${req.ip}`);
        res.status(403).json({
          status: 'false',
          reason: 'Request blocked',
        });
        return;
      }
      next();
    })
    .catch(() => {
      // On error, allow request
      next();
    });
}

// Unblock endpoint (for admin)
export async function unblockFingerprint(fingerprint: string): Promise<void> {
  await prisma.apiProtection.delete({
    where: { fingerprint },
  });
}