/**
 * Helpers shared by the `/api/*` endpoints. SvelteKit 3 deprecates `json()`
 * in favour of the platform's `Response.json()`.
 */
import type { Essay } from '../types.ts';
import { sanitizeEssayHtml } from '../utils/sanitize.ts';

export function apiError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return Response.json({ error: message, ...extra }, { status });
}

/** Reads a JSON body, returning `null` for malformed or non-object payloads. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export const MAX_PARAGRAPH_CHARS = 20_000;
export const MAX_NOTE_CHARS = 200;

export interface RevisionInput {
  paragraphs: string[];
  note: string;
  baseRevisionId: string | null;
}

/**
 * Validates a commit request. Paragraph count must match the essay (the studio
 * edits paragraphs in place; it doesn't add or remove them), and every
 * paragraph is sanitized server-side regardless of what the client sent.
 */
export function parseRevisionInput(
  body: Record<string, unknown>,
  essay: Essay
): { ok: true; value: RevisionInput } | { ok: false; message: string } {
  const { paragraphs, note = '', baseRevisionId = null } = body;

  if (!Array.isArray(paragraphs) || !paragraphs.every((p) => typeof p === 'string')) {
    return { ok: false, message: '`paragraphs` must be an array of strings.' };
  }
  if (paragraphs.length !== essay.paragraphs.length) {
    return { ok: false, message: `Expected ${essay.paragraphs.length} paragraphs.` };
  }
  if (paragraphs.some((p: string) => p.length > MAX_PARAGRAPH_CHARS)) {
    return { ok: false, message: 'A paragraph is too long.' };
  }
  if (typeof note !== 'string' || note.length > MAX_NOTE_CHARS) {
    return {
      ok: false,
      message: `\`note\` must be a string of at most ${MAX_NOTE_CHARS} characters.`,
    };
  }
  if (baseRevisionId !== null && typeof baseRevisionId !== 'string') {
    return { ok: false, message: '`baseRevisionId` must be a string or null.' };
  }

  return {
    ok: true,
    value: {
      paragraphs: (paragraphs as string[]).map(sanitizeEssayHtml),
      note: note.trim(),
      baseRevisionId,
    },
  };
}
