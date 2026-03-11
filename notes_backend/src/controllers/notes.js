const notesService = require('../services/notesService');
const { ValidationError } = require('../errors/apiErrors');
const {
  noteIdSchema,
  createNoteSchema,
  updateNoteSchema,
  listNotesQuerySchema,
  searchQuerySchema,
} = require('../validation/notesSchemas');

function zodToDetails(zodErr) {
  return zodErr.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
}

class NotesController {
  // PUBLIC_INTERFACE
  create(req, res) {
    /** Create note endpoint. */
    const parsed = createNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', zodToDetails(parsed.error));
    }
    const result = notesService.createNote(parsed.data);
    return res.status(201).json({ status: 'ok', data: result });
  }

  // PUBLIC_INTERFACE
  getById(req, res) {
    /** Get note by id endpoint. */
    const parsedId = noteIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      throw new ValidationError('Invalid note id', zodToDetails(parsedId.error));
    }
    const result = notesService.getNoteById({ id: parsedId.data });
    return res.status(200).json({ status: 'ok', data: result });
  }

  // PUBLIC_INTERFACE
  update(req, res) {
    /** Update note endpoint. */
    const parsedId = noteIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      throw new ValidationError('Invalid note id', zodToDetails(parsedId.error));
    }

    const parsedBody = updateNoteSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new ValidationError('Invalid request body', zodToDetails(parsedBody.error));
    }

    const result = notesService.updateNote({ id: parsedId.data, patch: parsedBody.data });
    return res.status(200).json({ status: 'ok', data: result });
  }

  // PUBLIC_INTERFACE
  remove(req, res) {
    /** Delete note endpoint. */
    const parsedId = noteIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      throw new ValidationError('Invalid note id', zodToDetails(parsedId.error));
    }
    const result = notesService.deleteNote({ id: parsedId.data });
    return res.status(200).json({ status: 'ok', data: result });
  }

  // PUBLIC_INTERFACE
  list(req, res) {
    /** List notes endpoint. */
    const parsed = listNotesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', zodToDetails(parsed.error));
    }
    const result = notesService.listNotes(parsed.data);
    return res.status(200).json({ status: 'ok', data: result });
  }

  // PUBLIC_INTERFACE
  search(req, res) {
    /** Search notes endpoint. */
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', zodToDetails(parsed.error));
    }
    const result = notesService.searchNotes(parsed.data);
    return res.status(200).json({ status: 'ok', data: result });
  }
}

module.exports = new NotesController();

