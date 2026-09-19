import { randomBytes } from 'crypto';

const CHARSET = '0123456789ABCDEFGHJKMNPQRSTUVWXYZ';

function getRandomChar(): string {
  return CHARSET[randomBytes(1)[0] % CHARSET.length];
}

export function generateLicenseKey(): string {
  const part1 = Array.from({ length: 5 }, () => getRandomChar()).join('');
  const part2 = Array.from({ length: 5 }, () => getRandomChar()).join('');
  return `${part1}-AGT-${part2}`;
}

export function formatExpirationDate(expiresAt: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${expiresAt.getFullYear()}-${pad(expiresAt.getMonth() + 1)}-${pad(expiresAt.getDate())} ${pad(expiresAt.getHours())}:${pad(expiresAt.getMinutes())}:${pad(expiresAt.getSeconds())}`;
}