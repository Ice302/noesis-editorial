import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorialStore } from './store.ts';
import {
  RateLimiter,
  generateSessionToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from './auth.ts';
import { parseRevisionInput } from './http.ts';
import { ESSAYS_DB } from '../data/essayContent.js';

describe('passwords', () => {
  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash.startsWith('scrypt$16384$8$1$')).toBe(true);
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'plaintext')).toBe(false);
  });
});

describe('session tokens', () => {
  it('are random, URL-safe, and stored only as a hash', () => {
    const a = generateSessionToken();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(a).not.toBe(generateSessionToken());
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('RateLimiter', () => {
  it('blocks after the limit until the window passes', () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.hit('k', 0)).toBe(0);
    expect(limiter.hit('k', 10)).toBe(0);
    expect(limiter.hit('k', 20)).toBeGreaterThan(0);
    expect(limiter.hit('k', 1001)).toBe(0);
  });
});

describe('EditorialStore', () => {
  let store: EditorialStore;
  let userId: number;

  beforeEach(() => {
    store = new EditorialStore(':memory:');
    userId = store.createUser('Ed', 'Ed Itor', 'hash');
  });
  afterEach(() => store.close());

  it('finds users case-insensitively and rejects duplicates', () => {
    expect(store.findUser('ed')?.displayName).toBe('Ed Itor');
    expect(() => store.createUser('ED', 'Dupe', 'h')).toThrow();
  });

  it('creates, extends and expires sessions', () => {
    store.createSession('t1', userId, 1000);
    expect(store.getSession('t1', 500)?.username).toBe('Ed');
    store.extendSession('t1', 5000);
    expect(store.getSession('t1', 2000)).not.toBeNull();
    expect(store.getSession('t1', 6000)).toBeNull();
    expect(store.getSession('t1', 0)).toBeNull(); // deleted on expiry
  });

  it('appends revisions with sequence numbers and author names', () => {
    const first = store.addRevision({
      essayId: 'ms-01',
      paragraphs: ['a'],
      note: 'n',
      authorId: userId,
      baseRevisionId: null,
    });
    expect(first.conflict).toBe(false);
    if (first.conflict) return;
    expect(first.revision).toMatchObject({ seq: 1, author: 'Ed Itor', paragraphs: ['a'] });

    const second = store.addRevision({
      essayId: 'ms-01',
      paragraphs: ['b'],
      note: '',
      authorId: userId,
      baseRevisionId: first.revision.id,
    });
    expect(second.conflict).toBe(false);
    expect(store.listRevisions('ms-01').map((r) => r.seq)).toEqual([1, 2]);
    expect(store.listRevisions('ms-02')).toEqual([]);
  });

  it('rejects a commit based on a stale revision', () => {
    const first = store.addRevision({
      essayId: 'ms-01',
      paragraphs: ['a'],
      note: '',
      authorId: userId,
      baseRevisionId: null,
    });
    const stale = store.addRevision({
      essayId: 'ms-01',
      paragraphs: ['b'],
      note: '',
      authorId: userId,
      baseRevisionId: null,
    });
    expect(stale.conflict).toBe(true);
    if (stale.conflict && !first.conflict) {
      expect(stale.revisions.map((r) => r.id)).toEqual([first.revision.id]);
    }
  });
});

describe('parseRevisionInput', () => {
  const essay = ESSAYS_DB[1];
  const paragraphs = [...essay.paragraphs];

  it('accepts a valid commit and sanitizes paragraphs', () => {
    const input = [...paragraphs];
    input[0] = 'x<script>alert(1)</script><img src=x onerror=1>';
    const result = parseRevisionInput({ paragraphs: input, note: ' hi ' }, essay);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.paragraphs[0]).toBe('x');
      expect(result.value.note).toBe('hi');
      expect(result.value.baseRevisionId).toBeNull();
    }
  });

  it('rejects wrong shapes and sizes', () => {
    expect(parseRevisionInput({ paragraphs: 'nope' }, essay).ok).toBe(false);
    expect(parseRevisionInput({ paragraphs: ['only one'] }, essay).ok).toBe(false);
    expect(parseRevisionInput({ paragraphs, note: 'x'.repeat(201) }, essay).ok).toBe(false);
    expect(parseRevisionInput({ paragraphs, baseRevisionId: 7 }, essay).ok).toBe(false);
    const huge = [...paragraphs];
    huge[0] = 'x'.repeat(20_001);
    expect(parseRevisionInput({ paragraphs: huge }, essay).ok).toBe(false);
  });
});
