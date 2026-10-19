/**
 * Browser client for the shared-editing API. `StudioState` depends on the
 * `StudioApi` interface rather than on `fetch`, so tests can pass a fake and a
 * static deployment (no server) simply reports `available: false`.
 */
import type { Editor, Revision } from '../types.ts';

export type CommitResult =
  | { status: 'ok'; revision: Revision }
  | { status: 'conflict'; revisions: Revision[] }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

export interface StudioApi {
  /** `available` is false when there's no server (static hosting) or it's unreachable. */
  session(): Promise<{ available: boolean; editor: Editor | null }>;
  login(
    username: string,
    password: string
  ): Promise<{ ok: true; editor: Editor } | { ok: false; message: string }>;
  logout(): Promise<void>;
  listRevisions(essayId: string): Promise<Revision[] | 'unauthorized' | null>;
  commitRevision(
    essayId: string,
    input: { paragraphs: string[]; note: string; baseRevisionId: string | null }
  ): Promise<CommitResult>;
}

async function body(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const isJson = (res: Response) =>
  res.headers.get('content-type')?.includes('application/json') ?? false;
const post = (url: string, data: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const httpApi: StudioApi = {
  async session() {
    try {
      const res = await fetch('/api/session');
      if (!res.ok || !isJson(res)) return { available: false, editor: null };
      const data = await body(res);
      return { available: true, editor: (data.editor as Editor | null) ?? null };
    } catch {
      return { available: false, editor: null };
    }
  },

  async login(username, password) {
    try {
      const res = await post('/api/auth/login', { username, password });
      const data = await body(res);
      if (res.ok) return { ok: true, editor: data.editor as Editor };
      return { ok: false, message: (data.error as string) ?? 'Sign-in failed.' };
    } catch {
      return { ok: false, message: 'Could not reach the server.' };
    }
  },

  async logout() {
    try {
      await post('/api/auth/logout', {});
    } catch {
      // Signing out locally is enough if the server is unreachable.
    }
  },

  async listRevisions(essayId) {
    try {
      const res = await fetch(`/api/essays/${encodeURIComponent(essayId)}/revisions`);
      if (res.status === 401) return 'unauthorized';
      if (!res.ok) return null;
      return ((await body(res)).revisions as Revision[]) ?? [];
    } catch {
      return null;
    }
  },

  async commitRevision(essayId, input) {
    try {
      const res = await post(`/api/essays/${encodeURIComponent(essayId)}/revisions`, input);
      const data = await body(res);
      if (res.status === 201) return { status: 'ok', revision: data.revision as Revision };
      if (res.status === 409)
        return { status: 'conflict', revisions: data.revisions as Revision[] };
      if (res.status === 401) return { status: 'unauthorized' };
      return {
        status: 'error',
        message: (data.error as string) ?? `Server error (${res.status}).`,
      };
    } catch {
      return { status: 'error', message: 'Could not reach the server.' };
    }
  },
};

/** API stand-in for tests and for environments without a server. */
export const offlineApi: StudioApi = {
  session: async () => ({ available: false, editor: null }),
  login: async () => ({ ok: false, message: 'Shared editing is not available.' }),
  logout: async () => {},
  listRevisions: async () => null,
  commitRevision: async () => ({ status: 'error', message: 'Shared editing is not available.' }),
};
