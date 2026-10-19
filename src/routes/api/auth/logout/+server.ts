import type { RequestHandler } from './$types';
import { SESSION_COOKIE, hashToken } from '#lib/server/auth.ts';
import { getStore } from '#lib/server/database.ts';

export const prerender = false;

export const POST: RequestHandler = ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE);
  if (token) getStore().deleteSession(hashToken(token));
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return Response.json({ ok: true });
};
