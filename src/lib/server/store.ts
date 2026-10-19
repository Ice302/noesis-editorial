/**
 * Persistence for shared editing, on Node's built-in SQLite (`node:sqlite`).
 *
 * Deliberately free of `$app/*` imports so the same code runs inside SvelteKit,
 * in Vitest (with an in-memory database) and in `scripts/add-editor.ts`.
 * Server-only: it lives under `src/lib/server/`, which SvelteKit refuses to
 * bundle for the browser.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Revision } from '../types.ts';

export interface UserRow {
  id: number;
  username: string;
  displayName: string;
  passwordHash: string;
}

export interface SessionUser {
  id: number;
  username: string;
  displayName: string;
  expiresAt: number;
}

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS users (
     id            INTEGER PRIMARY KEY,
     username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
     display_name  TEXT    NOT NULL,
     password_hash TEXT    NOT NULL,
     created_at    TEXT    NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT    PRIMARY KEY,
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS revisions (
     id         TEXT    PRIMARY KEY,
     essay_id   TEXT    NOT NULL,
     seq        INTEGER NOT NULL,
     paragraphs TEXT    NOT NULL,
     note       TEXT    NOT NULL DEFAULT '',
     author_id  INTEGER NOT NULL REFERENCES users(id),
     created_at TEXT    NOT NULL,
     UNIQUE (essay_id, seq)
   )`,
];

export class EditorialStore {
  readonly db: DatabaseSync;

  /** Opens (and if needed creates) the database. Pass `':memory:'` for tests. */
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON');
    if (path !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL');
    for (const sql of MIGRATIONS) this.db.exec(sql);
  }

  close() {
    this.db.close();
  }

  // --- users ----------------------------------------------------------------

  createUser(username: string, displayName: string, passwordHash: string): number {
    const result = this.db
      .prepare(
        'INSERT INTO users (username, display_name, password_hash, created_at) VALUES (?, ?, ?, ?)'
      )
      .run(username, displayName, passwordHash, new Date().toISOString());
    return Number(result.lastInsertRowid);
  }

  /** Updates the password of an existing user; returns false if there is no such user. */
  setPassword(username: string, passwordHash: string): boolean {
    const result = this.db
      .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
      .run(passwordHash, username);
    return Number(result.changes) > 0;
  }

  findUser(username: string): UserRow | null {
    const row = this.db
      .prepare(
        'SELECT id, username, display_name AS displayName, password_hash AS passwordHash FROM users WHERE username = ?'
      )
      .get(username);
    return (row as UserRow | undefined) ?? null;
  }

  // --- sessions -------------------------------------------------------------

  createSession(tokenHash: string, userId: number, expiresAt: number) {
    this.db
      .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(tokenHash, userId, expiresAt);
  }

  /** Returns the session's user, deleting the session if it has expired. */
  getSession(tokenHash: string, now = Date.now()): SessionUser | null {
    const row = this.db
      .prepare(
        `SELECT u.id, u.username, u.display_name AS displayName, s.expires_at AS expiresAt
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ?`
      )
      .get(tokenHash) as SessionUser | undefined;
    if (!row) return null;
    if (row.expiresAt <= now) {
      this.deleteSession(tokenHash);
      return null;
    }
    return row;
  }

  extendSession(tokenHash: string, expiresAt: number) {
    this.db
      .prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
      .run(expiresAt, tokenHash);
  }

  deleteSession(tokenHash: string) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }

  purgeExpiredSessions(now = Date.now()) {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  }

  // --- revisions --------------------------------------------------------------

  listRevisions(essayId: string): Revision[] {
    const rows = this.db
      .prepare(
        `SELECT r.id, r.essay_id AS essayId, r.seq, r.paragraphs, r.note,
                u.display_name AS author, r.created_at AS createdAt
           FROM revisions r JOIN users u ON u.id = r.author_id
          WHERE r.essay_id = ? ORDER BY r.seq`
      )
      .all(essayId) as (Omit<Revision, 'paragraphs'> & { paragraphs: string })[];
    return rows.map((row) => ({ ...row, paragraphs: JSON.parse(row.paragraphs) as string[] }));
  }

  /**
   * Appends a revision if `baseRevisionId` is still the latest one (optimistic
   * concurrency). Returns `{ conflict: true }` when someone else committed first.
   */
  addRevision(input: {
    essayId: string;
    paragraphs: string[];
    note: string;
    authorId: number;
    baseRevisionId: string | null;
  }): { conflict: false; revision: Revision } | { conflict: true; revisions: Revision[] } {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const latest = this.db
        .prepare('SELECT id, seq FROM revisions WHERE essay_id = ? ORDER BY seq DESC LIMIT 1')
        .get(input.essayId) as { id: string; seq: number } | undefined;

      if ((latest?.id ?? null) !== input.baseRevisionId) {
        this.db.exec('ROLLBACK');
        return { conflict: true, revisions: this.listRevisions(input.essayId) };
      }

      const id = randomUUID();
      const seq = (latest?.seq ?? 0) + 1;
      this.db
        .prepare(
          `INSERT INTO revisions (id, essay_id, seq, paragraphs, note, author_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.essayId,
          seq,
          JSON.stringify(input.paragraphs),
          input.note,
          input.authorId,
          new Date().toISOString()
        );
      this.db.exec('COMMIT');
      const revision = this.listRevisions(input.essayId).find((r) => r.id === id)!;
      return { conflict: false, revision };
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
