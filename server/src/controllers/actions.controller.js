'use strict';

// Action queue controller (CONTRACTS §5).
//   list    — founder/admin see all; analyst sees ONLY assignee=='analyst'
//             (object-level / IDOR demonstration via assignee filter).
//   ack     — records ackAt, status 'ack', audits.
//   resolve — records resolvedAt, status 'done', metSla = resolvedAt<=dueAt, audits.
const { db, nowIso, audit } = require('../db/db');
const { AppError } = require('../lib/AppError');

// Map a DB row to the API Action shape (CONTRACTS §5).
function toAction(row) {
  if (!row) return null;
  const breached =
    row.due_at &&
    (row.resolved_at
      ? new Date(row.resolved_at).getTime() > new Date(row.due_at).getTime()
      : Date.now() > new Date(row.due_at).getTime());
  return {
    id: row.id,
    idemKey: row.idem_key,
    sourceId: row.source_id,
    sopId: row.sop_id,
    sopTitle: row.sop_title,
    assignee: row.assignee,
    severity: row.severity,
    metric: row.metric,
    comparator: row.comparator,
    threshold: row.threshold,
    value: row.value,
    firedAt: row.fired_at,
    dueAt: row.due_at,
    slaHours: row.sla_hours,
    status: row.status,
    ackAt: row.ack_at || null,
    resolvedAt: row.resolved_at || null,
    metSla: row.met_sla === null || row.met_sla === undefined ? null : !!row.met_sla,
    breached: !!breached,
  };
}

function getRow(id) {
  return db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
}

// GET /api/actions
function list(req, res, next) {
  try {
    const user = req.user;
    let rows;
    if (user && (user.role === 'founder' || user.role === 'admin')) {
      rows = db.prepare('SELECT * FROM actions ORDER BY fired_at DESC').all();
    } else {
      // analyst (and any non-privileged role) only sees its own queue.
      rows = db
        .prepare("SELECT * FROM actions WHERE assignee = 'analyst' ORDER BY fired_at DESC")
        .all();
    }
    res.json(rows.map(toAction));
  } catch (err) {
    next(err);
  }
}

// Enforce object-level access: analysts may only act on analyst-assigned actions.
function assertCanAccess(user, row) {
  if (!row) throw new AppError(404, 'Action not found', 'NOT_FOUND');
  const privileged = user && (user.role === 'founder' || user.role === 'admin');
  if (!privileged && row.assignee !== 'analyst') {
    // Do not leak existence — respond 404 for cross-tenant access (IDOR guard).
    throw new AppError(404, 'Action not found', 'NOT_FOUND');
  }
}

// POST /api/actions/:id/ack
function ack(req, res, next) {
  try {
    const row = getRow(req.params.id);
    assertCanAccess(req.user, row);

    const ackAt = nowIso();
    const nextStatus = row.status === 'done' ? 'done' : 'ack';
    db.prepare('UPDATE actions SET ack_at = ?, status = ? WHERE id = ?').run(ackAt, nextStatus, row.id);
    audit(req.user ? req.user.email : 'system', 'action.ack', row.id, { idemKey: row.idem_key });
    res.json(toAction(getRow(row.id)));
  } catch (err) {
    next(err);
  }
}

// POST /api/actions/:id/resolve
function resolve(req, res, next) {
  try {
    const row = getRow(req.params.id);
    assertCanAccess(req.user, row);

    const resolvedAt = nowIso();
    const metSla = row.due_at ? new Date(resolvedAt).getTime() <= new Date(row.due_at).getTime() : null;
    db.prepare('UPDATE actions SET resolved_at = ?, status = ?, met_sla = ? WHERE id = ?').run(
      resolvedAt,
      'done',
      metSla === null ? null : metSla ? 1 : 0,
      row.id
    );
    audit(req.user ? req.user.email : 'system', 'action.resolve', row.id, {
      idemKey: row.idem_key,
      metSla,
    });
    res.json(toAction(getRow(row.id)));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, ack, resolve, toAction };
