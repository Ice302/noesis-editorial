import type { Handle } from '@sveltejs/kit/hooks';
import {
  SESSION_COOKIE,
  SESSION_RENEW_MS,
  SESSION_TTL_MS,
  hashToken,
  sessionCookieOptions,
} from '#lib/server/auth.ts';
import { getStore } from '#lib/server/database.ts';

/**
 * Resolves the signed-in editor for API requests. Pages are prerendered and
 * never read the session, so the database is only touched under `/api/`.
 */
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.editor = null;

  const token = event.url.pathname.startsWith('/api/')
    ? event.cookies.get(SESSION_COOKIE)
    : undefined;
  if (token) {
    const store = getStore();
    const tokenHash = hashToken(token);
    const session = store.getSession(tokenHash);

    if (session) {
      event.locals.editor = {
        id: session.id,
        username: session.username,
        displayName: session.displayName,
      };
      // Sliding expiry: extend active sessions once they pass the halfway mark.
      if (session.expiresAt - Date.now() < SESSION_RENEW_MS) {
        const expiresAt = Date.now() + SESSION_TTL_MS;
        store.extendSession(tokenHash, expiresAt);
        event.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
      }
    } else {
      event.cookies.delete(SESSION_COOKIE, { path: '/' });
    }
  }

  const response = await resolve(event);
  if (event.url.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
};
