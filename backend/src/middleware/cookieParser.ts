import { parse } from 'cookie';

/**
 * Minimal replacement for cookie-parser.
 * cookie-parser is just a thin wrapper around the 'cookie' package.
 */
export function cookieParser() {
  return (req: Record<string, any>, _res: Record<string, any>, next: () => void) => {
    if (req.headers && req.headers.cookie) {
      req.cookies = parse(req.headers.cookie);
    } else {
      req.cookies = {};
    }
    next();
  };
}
