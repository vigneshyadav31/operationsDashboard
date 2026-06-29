'use strict';

// Express application entrypoint. Wires middleware, mounts /api routes, serves the
// built client in production, and starts the background refresh job. Guarded so
// that `require`-ing this module in tests does NOT auto-listen — the listener only
// starts when the file is run directly (and not under NODE_ENV=test).
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { config } = require('./config/env');
const { logger } = require('./lib/logger');
const createGateway = require('./gateway');
const { attachUser } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { AppError } = require('./lib/AppError');

const authRoutes = require('./routes/auth.routes');
const widgetRoutes = require('./routes/widgets.routes');
const actionRoutes = require('./routes/actions.routes');
const healthRoutes = require('./routes/health.routes');
const { triggersRouter, refreshRouter } = require('./routes/actions.routes');
const { startRefreshJob, runOnce } = require('./jobs/refresh');

function buildApp() {
  const app = express();
  app.set('trust proxy', true);

  // CORS — allow the configured origin(s) with credentials (cookies).
  const allowedOrigins = String(config.corsOrigin || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / non-browser (no Origin header) and whitelisted origins.
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  // Gateway (rate limit + request-id/log guard) and user attachment.
  app.use(createGateway());
  app.use(attachUser);

  // API routes.
  app.use('/api/auth', authRoutes);
  app.use('/api/widgets', widgetRoutes);
  app.use('/api/actions', actionRoutes);
  app.use('/api/triggers', triggersRouter);
  app.use('/api/refresh', refreshRouter);
  app.use('/api/health', healthRoutes);

  // Unknown /api route -> 404 JSON.
  app.use('/api', (req, _res, next) => {
    next(new AppError(404, `No such endpoint: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
  });

  // In production, serve the built client + SPA fallback.
  if (config.isProduction) {
    const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    } else {
      logger.warn(`client/dist not found at ${clientDist}; static serving disabled`);
    }
  }

  // Central error handler (last).
  app.use(errorHandler);
  return app;
}

const app = buildApp();

// Start side effects (cron + initial run + listen) only when run directly.
function start() {
  startRefreshJob();
  // Populate caches + the action queue on startup (non-blocking).
  runOnce().catch((err) => logger.error(`startup runOnce failed: ${err.message}`));

  const server = app.listen(config.port, () => {
    logger.info(`Operations Dashboard API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });
  return server;
}

const isMain = require.main === module;
if (isMain && !config.isTest) {
  start();
}

module.exports = app;
module.exports.app = app;
module.exports.buildApp = buildApp;
module.exports.start = start;
