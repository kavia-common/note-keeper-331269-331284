const crypto = require('crypto');
const { getDb } = require('../db/sqlite');
const { NotFoundError, ConflictError } = require('../errors/apiErrors');

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return crypto.randomUUID();
}

function normalizeTagName(name) {
  return name.trim();
}

function rowToNote(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getTagsForNote(db, noteId) {
  const stmt = db.prepare(`
    SELECT t.name
    FROM tags t
    JOIN note_tags nt ON nt.tag_id = t.id
    WHERE nt.note_id = ?
    ORDER BY t.name ASC
  `);
  return stmt.all(noteId).map((r) => r.name);
}

function upsertTags(db, tagNames) {
  const now = nowIso();
  const insertTag = db.prepare('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)');
  const getTagByName = db.prepare('SELECT id, name FROM tags WHERE name = ?');

  const ids = [];
  for (const raw of tagNames) {
    const name = normalizeTagName(raw);
    const existing = getTagByName.get(name);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const id = makeId();
    try {
      insertTag.run(id, name, now);
      ids.push(id);
    } catch (e) {
      // In case of race/unique constraint, re-read.
      const retry = getTagByName.get(name);
      if (retry) ids.push(retry.id);
      else throw e;
    }
  }
  return ids;
}

function setNoteTags(db, noteId, tagNames) {
  const normalizedUnique = Array.from(new Set(tagNames.map((t) => normalizeTagName(t)))).filter(Boolean);
  const tagIds = upsertTags(db, normalizedUnique);

  const deleteExisting = db.prepare('DELETE FROM note_tags WHERE note_id = ?');
  const insertLink = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');

  const tx = db.transaction(() => {
    deleteExisting.run(noteId);
    for (const tagId of tagIds) {
      insertLink.run(noteId, tagId);
    }
  });
  tx();
}

function buildListQuery({ q, tag, limit, offset }) {
  const where = [];
  const params = [];

  if (q) {
    where.push('(n.title LIKE ? OR n.content LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like);
  }

  if (tag) {
    where.push(`
      EXISTS (
        SELECT 1
        FROM note_tags nt
        JOIN tags t ON t.id = nt.tag_id
        WHERE nt.note_id = n.id AND t.name = ?
      )
    `);
    params.push(tag);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT n.*
    FROM notes n
    ${whereClause}
    ORDER BY n.updated_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  return { sql, params };
}

// PUBLIC_INTERFACE
function createNote({ title, content, tags }) {
  /**
   * Create a note and optionally associate tags.
   *
   * Inputs: { title: string, content: string, tags?: string[] }
   * Output: { note: NoteWithTags }
   * Errors: ConflictError (rare), throws on DB errors
   * Side effects: writes to DB
   */
  const db = getDb();
  const id = makeId();
  const now = nowIso();

  const insert = db.prepare(`
    INSERT INTO notes (id, title, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  try {
    const tx = db.transaction(() => {
      insert.run(id, title, content, now, now);
      if (tags && tags.length) setNoteTags(db, id, tags);
    });
    tx();
  } catch (e) {
    throw new ConflictError('Failed to create note', { cause: e.message });
  }

  const noteRow = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  const note = rowToNote(noteRow);
  const noteTags = getTagsForNote(db, id);

  return { note: { ...note, tags: noteTags } };
}

// PUBLIC_INTERFACE
function getNoteById({ id }) {
  /**
   * Fetch a note by id.
   *
   * Inputs: { id: string }
   * Output: { note: NoteWithTags }
   * Errors: NotFoundError
   */
  const db = getDb();
  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!row) throw new NotFoundError('Note not found', { id });

  const note = rowToNote(row);
  const tags = getTagsForNote(db, id);
  return { note: { ...note, tags } };
}

// PUBLIC_INTERFACE
function updateNote({ id, patch }) {
  /**
   * Update note fields and/or tags.
   *
   * Inputs: { id: string, patch: { title?, content?, tags? } }
   * Output: { note: NoteWithTags }
   * Errors: NotFoundError
   */
  const db = getDb();
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!existing) throw new NotFoundError('Note not found', { id });

  const nextTitle = patch.title !== undefined ? patch.title : existing.title;
  const nextContent = patch.content !== undefined ? patch.content : existing.content;
  const nextUpdatedAt = nowIso();

  const updateStmt = db.prepare(`
    UPDATE notes
    SET title = ?, content = ?, updated_at = ?
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    updateStmt.run(nextTitle, nextContent, nextUpdatedAt, id);
    if (patch.tags !== undefined) {
      setNoteTags(db, id, patch.tags);
    }
  });
  tx();

  return getNoteById({ id });
}

// PUBLIC_INTERFACE
function deleteNote({ id }) {
  /**
   * Delete a note (and its tag links via cascade).
   *
   * Inputs: { id: string }
   * Output: { deleted: true }
   * Errors: NotFoundError
   */
  const db = getDb();
  const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
  const result = stmt.run(id);
  if (result.changes === 0) throw new NotFoundError('Note not found', { id });
  return { deleted: true };
}

// PUBLIC_INTERFACE
function listNotes({ q, tag, limit, offset }) {
  /**
   * List notes with optional text query and tag filter.
   *
   * Inputs: { q?, tag?, limit, offset }
   * Output: { notes: NoteWithTags[], limit, offset }
   */
  const db = getDb();
  const { sql, params } = buildListQuery({ q, tag, limit, offset });
  const rows = db.prepare(sql).all(...params);

  const notes = rows.map((r) => {
    const base = rowToNote(r);
    const tags = getTagsForNote(db, r.id);
    return { ...base, tags };
  });

  return { notes, limit, offset };
}

// PUBLIC_INTERFACE
function listTags() {
  /**
   * List all tags with usage count.
   *
   * Output: { tags: Array<{ name: string, count: number }> }
   */
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.name as name, COUNT(nt.note_id) as count
    FROM tags t
    LEFT JOIN note_tags nt ON nt.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.name ASC
  `).all();

  return { tags: rows.map((r) => ({ name: r.name, count: r.count })) };
}

// PUBLIC_INTERFACE
function searchNotes({ q, tag, limit, offset }) {
  /**
   * Search notes (alias of listNotes with required q).
   *
   * Inputs: { q: string, tag?, limit, offset }
   * Output: { notes: NoteWithTags[], limit, offset }
   */
  return listNotes({ q, tag, limit, offset });
}

module.exports = {
  createNote,
  getNoteById,
  updateNote,
  deleteNote,
  listNotes,
  listTags,
  searchNotes,
};

