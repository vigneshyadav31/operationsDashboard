import React from 'react';
import { EmptyState } from './_shared.jsx';

function cell(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function TableW({ data }) {
  if (!data) return <EmptyState />;
  const rows = Array.isArray(data.rows) ? data.rows : [];

  let columns = Array.isArray(data.columns) ? data.columns : [];
  if (columns.length === 0 && rows.length > 0) {
    const keys = new Set();
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
    columns = [...keys].map((k) => ({ key: k, label: k }));
  }

  if (rows.length === 0 || columns.length === 0) return <EmptyState message="No rows" />;

  return (
    <div className="w-table-wrap">
      <table className="w-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.label ?? c.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>
              {columns.map((c) => (
                <td key={c.key} title={cell(r?.[c.key])}>
                  {cell(r?.[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
