'use strict';

const express = require('express');
const { db } = require('../db/db');
const cache = require('../cache/cache');
const { getAdapters } = require('../config/sources');

const router = express.Router();
const START_TIME = Date.now();

let version = '1.0.0';
try {
  // eslint-disable-next-line global-require
  version = require('../../package.json').version || version;
} catch (_e) {
  /* keep default */
}

// GET /api/health -> { status:'ok', uptimeSec, version, checks:{db,cache,sourcesLoaded} }
router.get('/', (_req, res) => {
  let dbOk = false;
  try {
    db.prepare('SELECT 1 AS ok').get();
    dbOk = true;
  } catch (_e) {
    dbOk = false;
  }

  let cacheOk = false;
  try {
    cache.set('__health__', { ts: Date.now() }, 5, 'fresh');
    cacheOk = !!cache.get('__health__');
  } catch (_e) {
    cacheOk = false;
  }

  let sourcesLoaded = 0;
  try {
    sourcesLoaded = getAdapters().length;
  } catch (_e) {
    sourcesLoaded = 0;
  }

  res.json({
    status: 'ok',
    uptimeSec: Math.floor((Date.now() - START_TIME) / 1000),
    version,
    checks: {
      db: dbOk,
      cache: cacheOk,
      sourcesLoaded,
    },
  });
});

module.exports = router;
