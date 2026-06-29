'use strict';

const { db, nowIso, audit } = require('../db/db');
const { AppError } = require('../lib/AppError');

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

function list(req, res, next) {
  try {
    const user = req.user;
    let rows;
    if (user && (user.role === 'founder' || user.role === 'admin')) {
      rows = db.prepare('SELECT * FROM actions ORDER BY fired_at DESC').all();
    } else {

      rows = db
        .prepare("SELECT * FROM actions WHERE assignee = 'analyst' ORDER BY fired_at DESC")
        .all();
    }
    res.json(rows.map(toAction));
  } catch (err) {
    next(err);
  }
}

function assertCanAccess(user, row) {
  if (!row) throw new AppError(404, 'Action not found', 'NOT_FOUND');
  const privileged = user && (user.role === 'founder' || user.role === 'admin');
  if (!privileged && row.assignee !== 'analyst') {

    throw new AppError(404, 'Action not found', 'NOT_FOUND');
  }
}

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
