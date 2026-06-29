import React, { useEffect, useState } from 'react';

const SEV_RANK = { high: 0, medium: 1, low: 2 };

function formatCountdown(ms) {
  const overdue = ms < 0;
  let s = Math.floor(Math.abs(ms) / 1000);
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const pad = (n) => String(n).padStart(2, '0');
  let str;
  if (d > 0) str = `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  else str = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return { str, overdue };
}

// Live SLA countdown that ticks every second.
function Sla({ action, now }) {
  if (action.status === 'done') {
    const met = action.metSla;
    return (
      <span className={`sla done`} title={`Resolved ${new Date(action.resolvedAt).toLocaleString()}`}>
        {met === false ? 'Resolved (SLA missed)' : 'Resolved on time'}
      </span>
    );
  }
  const due = new Date(action.dueAt).getTime();
  const remaining = due - now;
  const { str, overdue } = formatCountdown(remaining);
  // "warn" inside last 2 hours.
  const warn = !overdue && remaining < 2 * 3600 * 1000;
  const cls = overdue ? 'overdue' : warn ? 'warn' : '';
  return (
    <span
      className={`sla ${cls}`}
      title={`Due ${new Date(action.dueAt).toLocaleString()}`}
      aria-label={overdue ? `Overdue by ${str}` : `Due in ${str}`}
    >
      <span aria-hidden="true">{overdue ? '⚠' : '⏱'}</span>
      {overdue ? `Overdue ${str}` : str}
    </span>
  );
}

function ActionCard({ action, now, onAck, onResolve, busyId }) {
  const overdue =
    action.status !== 'done' && new Date(action.dueAt).getTime() - now < 0;
  const sev = action.severity || 'low';
  const busy = busyId === action.id;

  return (
    <li
      className={`action-card sev-${sev} ${action.status === 'done' ? 'is-done' : ''} ${
        overdue ? 'is-overdue' : ''
      }`}
    >
      <div className="action-top">
        <div>
          <div className="action-title">{action.sopTitle}</div>
          <div className="action-source">
            {action.sourceId} &middot; {action.sopId} &middot; {action.assignee}
          </div>
        </div>
        <span className={`sev-pill ${sev}`}>{sev}</span>
      </div>

      <div className="action-metric">
        <span>
          <b>{action.metric}</b>
        </span>
        <span>
          {action.value} <span aria-hidden="true">vs</span> {action.comparator} {action.threshold}
        </span>
      </div>

      <div className="action-bottom">
        <Sla action={action} now={now} />
        <span className="action-status">{action.status}</span>
      </div>

      {action.status !== 'done' && (
        <div className="action-actions">
          {action.status === 'open' && (
            <button
              className="btn btn-sm"
              disabled={busy}
              onClick={() => onAck(action.id)}
              aria-label={`Acknowledge ${action.sopTitle}`}
            >
              {busy ? '…' : 'Ack'}
            </button>
          )}
          <button
            className="btn btn-sm btn-primary"
            disabled={busy}
            onClick={() => onResolve(action.id)}
            aria-label={`Resolve ${action.sopTitle}`}
          >
            {busy ? '…' : 'Resolve'}
          </button>
        </div>
      )}
    </li>
  );
}

export default function ActionQueue({ actions, onAck, onResolve }) {
  const [now, setNow] = useState(Date.now());
  const [busyId, setBusyId] = useState(null);

  // Tick once a second so every SLA countdown stays live.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const list = Array.isArray(actions) ? actions : [];

  // Sort: open/ack before done; then overdue first; then by due time; then severity.
  const sorted = [...list].sort((a, b) => {
    const aDone = a.status === 'done' ? 1 : 0;
    const bDone = b.status === 'done' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    const aDue = new Date(a.dueAt).getTime();
    const bDue = new Date(b.dueAt).getTime();
    if (aDue !== bDue) return aDue - bDue;
    return (SEV_RANK[a.severity] ?? 3) - (SEV_RANK[b.severity] ?? 3);
  });

  const openCount = list.filter((a) => a.status !== 'done').length;

  async function handle(fn, id) {
    setBusyId(id);
    try {
      await fn(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="queue" aria-label="SOP Action Queue">
      <div className="queue-head">
        <h2>Action Queue</h2>
        <span className="section-count" aria-label={`${openCount} open actions`}>
          {openCount} open
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="queue-empty">
          <div className="ico" aria-hidden="true">
            ✓
          </div>
          <strong>All clear</strong>
          <div>No SOP actions triggered. Operations are nominal.</div>
        </div>
      ) : (
        <ul className="queue-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {sorted.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              now={now}
              busyId={busyId}
              onAck={(id) => handle(onAck, id)}
              onResolve={(id) => handle(onResolve, id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
