import React from 'react';

export const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#65a30d'];

export function fmtNum(v, digits = 2) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function Delta({ value, unit = '%' }) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
    return null;
  }
  const n = Number(value);
  const dir = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
  const arrow = n > 0 ? '▲' : n < 0 ? '▼' : '▬';
  return (
    <span className={`delta ${dir}`} aria-label={`change ${n} ${unit}`}>
      <span aria-hidden="true">{arrow}</span>
      {n > 0 ? '+' : ''}
      {fmtNum(n)}
      {unit}
    </span>
  );
}

export function EmptyState({ message = 'No data available' }) {
  return (
    <div className="w-empty" role="status">
      <span className="w-state-icon" aria-hidden="true">
        ◌
      </span>
      <span>{message}</span>
    </div>
  );
}

export function heatColor(t) {
  const c = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  if (c < 0.5) {

    const k = c / 0.5;
    const r = Math.round(52 + (217 - 52) * k);
    const g = Math.round(211 + (119 - 211) * k);
    const b = Math.round(153 + (6 - 153) * k);
    return `rgb(${r},${g},${b})`;
  }

  const k = (c - 0.5) / 0.5;
  const r = Math.round(217 + (220 - 217) * k);
  const g = Math.round(119 + (38 - 119) * k);
  const b = Math.round(6 + (38 - 6) * k);
  return `rgb(${r},${g},${b})`;
}
