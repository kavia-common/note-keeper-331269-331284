const express = require('express');
const healthController = require('../controllers/health');
const notesRouter = require('./notes');
const tagsRouter = require('./tags');
const searchRouter = require('./search');

const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health endpoint
 *     description: Service health check endpoint.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/', healthController.check.bind(healthController));

router.use('/notes', notesRouter);
router.use('/tags', tagsRouter);
router.use('/search', searchRouter);

module.exports = router;

