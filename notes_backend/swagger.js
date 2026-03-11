const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notes API',
      version: '1.0.0',
      description: 'REST API for a notes app (CRUD, tags, search) backed by SQLite.',
    },
    tags: [
      { name: 'Health', description: 'Service health and readiness' },
      { name: 'Notes', description: 'CRUD operations for notes' },
      { name: 'Tags', description: 'Tag listing and metadata' },
      { name: 'Search', description: 'Search notes' },
    ],
  },
  apis: ['./src/routes/**/*.js'], // include nested route modules
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;

