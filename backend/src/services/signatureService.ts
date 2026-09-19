import crypto from 'crypto';

export interface SignatureParams {
  keyId: string;
  timestamp: string;
  nonce: string;
  method: string;
  path: string;
  body?: string;
}

export class SignatureService {
  private readonly algorithm = 'sha256';
  private readonly timestampTolerance = 300000;

  generateSignature(secret: string, params: SignatureParams): string {
    const { keyId, timestamp, nonce, method, path, body } = params;
    
    const payload = [
      keyId,
      timestamp,
      nonce,
      method.toUpperCase(),
      path,
      body || '',
    ].join('\n');

    return crypto
      .createHmac(this.algorithm, secret)
      .update(payload)
      .digest('hex');
  }

  verifySignature(secret: string, signature: string, params: SignatureParams): boolean {
    const { timestamp } = params;
    const requestTime = parseInt(timestamp, 10);

    if (isNaN(requestTime)) {
      return false;
    }

    const now = Date.now();
    if (Math.abs(now - requestTime) > this.timestampTolerance) {
      console.warn('Request timestamp outside tolerance window');
      return false;
    }

    const expectedSignature = this.generateSignature(secret, params);
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  generateTimestamp(): string {
    return Date.now().toString();
  }
}

export const signatureService = new SignatureService();

export function createSignatureMiddleware() {
  return (req: any, res: any, next: any) => {
    const signature = req.headers['x-api-signature'];
    const keyId = req.headers['x-api-key-id'];
    const timestamp = req.headers['x-api-timestamp'];
    const nonce = req.headers['x-api-nonce'];

    if (!signature || !keyId || !timestamp || !nonce) {
      return next();
    }

    req.signatureParams = {
      keyId,
      timestamp,
      nonce,
      method: req.method,
      path: req.path,
      body: req.body ? JSON.stringify(req.body) : undefined,
    };

    next();
  };
}
