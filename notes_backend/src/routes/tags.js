const express = require('express');
const tagsController = require('../controllers/tags');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Tags
 *     description: Tag listing and metadata
 */

/**
 * @swagger
 * /tags:
 *   get:
 *     tags: [Tags]
 *     summary: List tags
 *     description: Returns all tags with a usage count (number of notes associated with the tag).
 *     responses:
 *       200:
 *         description: Tags list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 data:
 *                   type: object
 *                   properties:
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name: { type: string, example: personal }
 *                           count: { type: integer, example: 3 }
 */
router.get('/', asyncHandler(tagsController.list.bind(tagsController)));

module.exports = router;

