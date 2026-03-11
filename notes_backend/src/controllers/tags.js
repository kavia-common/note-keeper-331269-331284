const notesService = require('../services/notesService');

class TagsController {
  // PUBLIC_INTERFACE
  list(req, res) {
    /** List tags endpoint. */
    const result = notesService.listTags();
    return res.status(200).json({ status: 'ok', data: result });
  }
}

module.exports = new TagsController();

