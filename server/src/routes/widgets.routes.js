'use strict';

const express = require('express');
const ctrl = require('../controllers/widgets.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, ctrl.list);
router.get('/:id', requireAuth, ctrl.getOne);
router.post('/:id/refresh', requireAuth, requireRole('founder', 'admin'), ctrl.refreshOne);

module.exports = router;
