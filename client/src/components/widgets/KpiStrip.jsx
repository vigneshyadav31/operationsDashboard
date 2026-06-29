import React from 'react';
import { fmtNum, Delta, EmptyState } from './_shared.jsx';

export default function KpiStrip({ data }) {
  const items = data && Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return <EmptyState />;

  return (
    <div className="kpi-strip" role="list">
      {items.map((it, i) => (
        <div className="cell" role="listitem" key={it.label ?? i}>
          <div className="l">{it.label ?? '—'}</div>
          <div className="v">
            {fmtNum(it.value)}
            {it.unit ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}> {it.unit}</span> : null}
          </div>
          <Delta value={it.delta} unit="%" />
        </div>
      ))}
    </div>
  );
}
