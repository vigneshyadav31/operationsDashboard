'use strict';

const express = require('express');
const { z } = require('zod');
const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
  role: z.enum(['founder', 'analyst', 'admin']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', ctrl.me);

module.exports = router;
