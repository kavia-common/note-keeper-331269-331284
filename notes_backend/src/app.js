const cors = require('cors');
const express = require('express');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');
const { getDb } = require('./db/sqlite');
const { errorHandler } = require('./middleware/errors');

// Initialize express app
const app = express();

// Initialize DB early so failures are obvious at boot and not mid-request.
getDb();

function parseCsvEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

const allowedOrigins = parseCsvEnv('ALLOWED_ORIGINS', ['http://localhost:3000']);
const allowedMethods = parseCsvEnv('ALLOWED_METHODS', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']);
const allowedHeaders = parseCsvEnv('ALLOWED_HEADERS', ['Content-Type', 'Authorization']);
const corsMaxAge = Number(process.env.CORS_MAX_AGE || 0) || undefined;

app.use(
  cors({
    /**
     * Allow only configured origins (comma-separated in ALLOWED_ORIGINS).
     * This enables the frontend (typically :3000) to call this backend (:3001).
     */
    origin(origin, callback) {
      // Allow same-origin/non-browser requests (no Origin header).
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.includes(origin);
      return callback(isAllowed ? null : new Error('CORS origin not allowed'), isAllowed);
    },
    methods: allowedMethods,
    allowedHeaders,
    maxAge: corsMaxAge,
  })
);

// Some environments (including preview/proxy) require trust proxy for correct scheme/host.
app.set('trust proxy', String(process.env.TRUST_PROXY || 'true').toLowerCase() !== 'false');

app.get('/openapi.json', (req, res) => {
  // Provide a stable OpenAPI endpoint for tooling and the frontend.
  res.status(200).json(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host'); // may or may not include port
  let protocol = req.protocol; // http or https

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');

  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
      (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${fullHost}`,
      },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

// Parse JSON request body
app.use(express.json());

// Mount routes
app.use('/', routes);

// Centralized error handling middleware (consistent error contract)
app.use(errorHandler);

module.exports = app;

