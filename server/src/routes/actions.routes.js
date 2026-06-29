'use strict';

const express = require('express');
const ctrl = require('../controllers/actions.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getRules } = require('../triggers/rules');
const { evaluateAll } = require('../triggers/engine');

const router = express.Router();
router.get('/', requireAuth, ctrl.list);
router.post('/:id/ack', requireAuth, ctrl.ack);
router.post('/:id/resolve', requireAuth, ctrl.resolve);

const triggersRouter = express.Router();
triggersRouter.get('/rules', requireAuth, (_req, res) => {
  res.json(getRules());
});

const refreshRouter = express.Router();
refreshRouter.post('/', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const { refreshAll } = require('../jobs/refresh');
    const refreshed = await refreshAll();
    const summary = await evaluateAll();
    res.status(202).json({ ran: refreshed, ...summary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.actionsRouter = router;
module.exports.triggersRouter = triggersRouter;
module.exports.refreshRouter = refreshRouter;
