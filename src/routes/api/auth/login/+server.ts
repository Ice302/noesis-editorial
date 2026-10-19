import type { RequestHandler } from './$types';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  generateSessionToken,
  getDummyHash,
  hashToken,
  loginLimiter,
  sessionCookieOptions,
  verifyPassword,
} from '#lib/server/auth.ts';
import { getStore } from '#lib/server/database.ts';
import { apiError, readJson } from '#lib/server/http.ts';

export const prerender = false;

const INVALID = 'Invalid username or password.';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const body = await readJson(request);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username || !password || password.length > 1024) return apiError(400, INVALID);

  const limitKey = `${getClientAddress()}|${username.toLowerCase()}`;
  const retryAfter = loginLimiter.hit(limitKey);
  if (retryAfter > 0) {
    return apiError(429, `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} min.`, {
      retryAfter,
    });
  }

  const store = getStore();
  const user = store.findUser(username);
  // Always run scrypt, even for unknown users, so timing doesn't reveal valid usernames.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) return apiError(401, INVALID);

  loginLimiter.reset(limitKey);
  const token = generateSessionToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  store.createSession(hashToken(token), user.id, expiresAt);
  cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));

  return Response.json({ editor: { username: user.username, displayName: user.displayName } });
};
