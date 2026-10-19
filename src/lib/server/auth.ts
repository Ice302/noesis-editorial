/**
 * Authentication primitives: password hashing, session tokens and a small
 * login rate limiter. No `$app/*` imports, so the CLI can reuse them.
 *
 * - Passwords: scrypt (memory-hard, built into Node) with a random 16-byte salt,
 *   stored as `scrypt$N$r$p$salt$hash` so parameters can be raised later.
 * - Sessions: a random 32-byte token lives only in the editor's httpOnly cookie;
 *   the database stores its SHA-256, so a leaked database can't be replayed.
 */
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

function scryptAsync(
  password: string,
  salt: Buffer,
  N: number,
  r: number,
  p: number,
  keylen: number
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT.N, SCRYPT.r, SCRYPT.p, SCRYPT.keylen);
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, keyB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scryptAsync(
    password,
    Buffer.from(saltB64, 'base64'),
    Number(n),
    Number(r),
    Number(p),
    expected.length
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * A precomputed hash used when the username doesn't exist, so a failed login
 * takes the same time either way and doesn't reveal which usernames are valid.
 */
let dummyHash: Promise<string> | undefined;
export function getDummyHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  return dummyHash;
}

export const SESSION_COOKIE = 'noesis_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** Sessions are extended on use once less than this much time remains. */
export const SESSION_RENEW_MS = 15 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions(expiresAt: number) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    // SvelteKit defaults `secure` to true and relaxes it for http://localhost.
    expires: new Date(expiresAt),
  };
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const PASSWORD_MIN_LENGTH = 10;
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/i;

/**
 * Fixed-window limiter for login attempts, keyed by client address and
 * username. In-memory, so it resets on restart and is per-process — enough to
 * blunt password guessing against a small editorial team's server.
 */
export class RateLimiter {
  #hits = new Map<string, { count: number; resetAt: number }>();
  readonly limit: number;
  readonly windowMs: number;

  // (No constructor parameter properties: Node's type stripping, used by the
  // CLI script, only supports erasable TypeScript syntax.)
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /** Records an attempt; returns the seconds to wait if the key is over the limit. */
  hit(key: string, now = Date.now()): number {
    const entry = this.#hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.#hits.set(key, { count: 1, resetAt: now + this.windowMs });
      if (this.#hits.size > 10_000) this.#prune(now);
      return 0;
    }
    entry.count++;
    return entry.count > this.limit ? Math.ceil((entry.resetAt - now) / 1000) : 0;
  }

  reset(key: string) {
    this.#hits.delete(key);
  }

  #prune(now: number) {
    for (const [key, entry] of this.#hits) if (entry.resetAt <= now) this.#hits.delete(key);
  }
}

/** 5 attempts per 15 minutes for each address + username pair. */
export const loginLimiter = new RateLimiter(5, 15 * 60 * 1000);
