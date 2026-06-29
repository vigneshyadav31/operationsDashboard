'use strict';

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

  const allowedOrigins = String(config.corsOrigin || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin(origin, cb) {

        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  app.use(createGateway());
  app.use(attachUser);

  app.use('/api/auth', authRoutes);
  app.use('/api/widgets', widgetRoutes);
  app.use('/api/actions', actionRoutes);
  app.use('/api/triggers', triggersRouter);
  app.use('/api/refresh', refreshRouter);
  app.use('/api/health', healthRoutes);

  app.use('/api', (req, _res, next) => {
    next(new AppError(404, `No such endpoint: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
  });

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

  app.use(errorHandler);
  return app;
}

const app = buildApp();

function start() {
  startRefreshJob();

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
