import prisma from '../prisma';

const WINDOW_SIZE_MS = 60 * 1000;

export class RateLimitService {
  async check(keyValue: string, limit: number): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = new Date();
    const windowStart = new Date(Math.floor(now.getTime() / WINDOW_SIZE_MS) * WINDOW_SIZE_MS);
    const resetAt = new Date(windowStart.getTime() + WINDOW_SIZE_MS);

    try {
      const entry = await prisma.rateLimitEntry.upsert({
        where: {
          keyValue_windowStart: { keyValue, windowStart },
        },
        update: {
          requestCount: { increment: 1 },
        },
        create: {
          keyValue,
          windowStart,
          requestCount: 1,
        },
      });

      const remaining = Math.max(0, limit - entry.requestCount);
      const allowed = entry.requestCount <= limit;

      return { allowed, remaining, resetAt };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: limit, resetAt };
    }
  }

  async getUsage(keyValue: string, limit: number): Promise<{ used: number; limit: number; percentage: number }> {
    const now = new Date();
    const windowStart = new Date(Math.floor(now.getTime() / WINDOW_SIZE_MS) * WINDOW_SIZE_MS);

    try {
      const entry = await prisma.rateLimitEntry.findUnique({
        where: {
          keyValue_windowStart: { keyValue, windowStart },
        },
      });

      const used = entry?.requestCount || 0;
      return {
        used,
        limit,
        percentage: limit > 0 ? (used / limit) * 100 : 0,
      };
    } catch (error) {
      console.error('Rate limit usage error:', error);
      return { used: 0, limit, percentage: 0 };
    }
  }

  async cleanup(): Promise<number> {
    const cutoff = new Date(Date.now() - WINDOW_SIZE_MS * 2);

    try {
      const result = await prisma.rateLimitEntry.deleteMany({
        where: {
          windowStart: { lt: cutoff },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Rate limit cleanup error:', error);
      return 0;
    }
  }
}

export const rateLimitService = new RateLimitService();

setInterval(() => {
  rateLimitService.cleanup().then(count => {
    if (count > 0) {
      console.log(`Rate limit cleanup: removed ${count} entries`);
    }
  });
}, WINDOW_SIZE_MS);
