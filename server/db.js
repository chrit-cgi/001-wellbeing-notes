/**
 * SQLite database initialisation and schema migration.
 * Uses the built-in node:sqlite module (Node.js 22.5+, stable in Node 24).
 * Call initDb() once at server startup.
 */
import { DatabaseSync } from 'node:sqlite'

let db

/**
 * @param {string} [path] - File path for the SQLite database.
 *   Pass ':memory:' for an in-memory database (tests).
 * @returns {DatabaseSync}
 */
export function initDb(path = process.env.DATABASE_PATH ?? './data/db.sqlite') {
  db = new DatabaseSync(path)
  // WAL mode is not applicable to in-memory databases
  if (path !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL')
  }
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db)
  return db
}

/** @returns {DatabaseSync} */
export function getDb() {
  if (!db) throw new Error('Database not initialised. Call initDb() first.')
  return db
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name    TEXT NOT NULL DEFAULT '',
      last_name     TEXT NOT NULL DEFAULT '',
      role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
      active        INTEGER NOT NULL DEFAULT 1   CHECK (active IN (0,1)),
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT    NOT NULL,
      date       TEXT    NOT NULL,
      score      INTEGER NOT NULL DEFAULT 5
                         CHECK (score >= 0 AND score <= 10),
      body       TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL,
      updated_at TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_user_date
      ON notes (user_id, date DESC);

    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts
      USING fts5(body, content='notes', content_rowid='id');

    CREATE TRIGGER IF NOT EXISTS notes_ai
      AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, body) VALUES (new.id, new.body);
      END;

    CREATE TRIGGER IF NOT EXISTS notes_ad
      AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, body)
          VALUES ('delete', old.id, old.body);
      END;

    CREATE TRIGGER IF NOT EXISTS notes_au
      AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, body)
          VALUES ('delete', old.id, old.body);
        INSERT INTO notes_fts(rowid, body) VALUES (new.id, new.body);
      END;
  `)
}
