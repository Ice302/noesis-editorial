import type { RequestHandler } from './$types';
import { ESSAYS_DB } from '#lib/data/essayContent.js';
import { getStore } from '#lib/server/database.ts';
import { apiError, parseRevisionInput, readJson } from '#lib/server/http.ts';

export const prerender = false;

const findEssay = (id: string) => ESSAYS_DB.find((e) => e.id === id);

/** Revision history of one essay (signed-in editors only). */
export const GET: RequestHandler = ({ params, locals }) => {
  if (!locals.editor) return apiError(401, 'Sign in to view shared revisions.');
  if (!findEssay(params.id)) return apiError(404, 'Unknown essay.');
  return Response.json({ revisions: getStore().listRevisions(params.id) });
};

/**
 * Commits a revision. `baseRevisionId` must be the latest revision the client
 * has seen; if a colleague committed in the meantime the response is 409 with
 * the current history, and nothing is written.
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
  if (!locals.editor) return apiError(401, 'Sign in to commit shared revisions.');
  const essay = findEssay(params.id);
  if (!essay) return apiError(404, 'Unknown essay.');

  const body = await readJson(request);
  if (!body) return apiError(400, 'Expected a JSON object.');
  const parsed = parseRevisionInput(body, essay);
  if (!parsed.ok) return apiError(400, parsed.message);

  const result = getStore().addRevision({
    essayId: essay.id,
    authorId: locals.editor.id,
    ...parsed.value,
  });

  if (result.conflict) {
    return apiError(409, 'A newer revision was committed by someone else.', {
      revisions: result.revisions,
    });
  }
  return Response.json({ revision: result.revision }, { status: 201 });
};
