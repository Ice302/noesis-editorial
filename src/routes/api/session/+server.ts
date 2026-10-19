import type { RequestHandler } from './$types';

export const prerender = false;

/** Who is signed in. A 200 here also tells the client that shared editing is available. */
export const GET: RequestHandler = ({ locals }) => {
  const editor = locals.editor
    ? { username: locals.editor.username, displayName: locals.editor.displayName }
    : null;
  return Response.json({ editor });
};
