const express = require('express');
const notesController = require('../controllers/notes');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Search
 *     description: Search notes by substring and optional tag filter
 */

/**
 * @swagger
 * /search:
 *   get:
 *     tags: [Search]
 *     summary: Search notes
 *     description: Search notes by substring match against title/content; optionally filter by tag.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Substring to match in title or content.
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *         description: Tag name to filter notes.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, minimum: 1, maximum: 200 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0, minimum: 0 }
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 data:
 *                   type: object
 *                   properties:
 *                     notes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Note'
 *                     limit: { type: integer }
 *                     offset: { type: integer }
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', asyncHandler(notesController.search.bind(notesController)));

module.exports = router;

