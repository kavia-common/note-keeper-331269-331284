const path = require('path');
const Database = require('better-sqlite3');

/**
 * SQLite access layer (adapter).
 *
 * - Reads DB path from env SQLITE_DB (recommended) or defaults to ./data/notes.sqlite
 * - Exposes a singleton DB connection and runs lightweight migrations on startup
 *
 * NOTE: better-sqlite3 is synchronous and very fast for SQLite workloads; this keeps
 * flows deterministic and simplifies debugging.
 */

let dbSingleton = null;

function resolveDbPath() {
  // Prefer configured env var (provided by the 'database' container): SQLITE_DB
  // If absent, fall back to a local file in this backend container.
  return process.env.SQLITE_DB || path.join(process.cwd(), 'data', 'notes.sqlite');
}

function runMigrations(db) {
  // Basic pragmas for integrity and concurrency.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Notes table: stores note content.
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Tags are normalized. Many-to-many between notes and tags.
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);

  // Helpful indexes for search and tag listing.
  db.exec('CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);');
}

// PUBLIC_INTERFACE
function getDb() {
  /**
   * Get (and initialize) the SQLite connection singleton.
   *
   * Contract:
   * - Returns: better-sqlite3 Database instance (singleton)
   * - Side effects: opens database file, runs migrations once per process
   * - Errors: throws if database file cannot be opened or migration fails
   */
  if (dbSingleton) return dbSingleton;

  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  runMigrations(db);
  dbSingleton = db;
  return dbSingleton;
}

module.exports = {
  getDb,
};

