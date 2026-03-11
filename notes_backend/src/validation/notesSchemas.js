const { z } = require('zod');

const isoDateTimeString = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: 'Must be an ISO date-time string',
});

const noteIdSchema = z.string().min(1, 'id is required');

const tagNameSchema = z
  .string()
  .min(1, 'Tag name is required')
  .max(64, 'Tag name too long')
  .regex(/^[\p{L}\p{N} _-]+$/u, 'Tag name contains invalid characters');

const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(tagNameSchema).optional().default([]),
});

const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(tagNameSchema).optional(),
});

const listNotesQuerySchema = z.object({
  q: z.string().optional(),
  tag: tagNameSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const searchQuerySchema = z.object({
  q: z.string().min(1, 'q is required'),
  tag: tagNameSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

module.exports = {
  isoDateTimeString,
  noteIdSchema,
  tagNameSchema,
  createNoteSchema,
  updateNoteSchema,
  listNotesQuerySchema,
  searchQuerySchema,
};

