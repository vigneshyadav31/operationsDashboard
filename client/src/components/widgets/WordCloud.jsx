import React from 'react';
import { PALETTE, EmptyState } from './_shared.jsx';

// widgetData: { words:[{text,weight}], rows?:[{...}] }
export default function WordCloud({ data }) {
  const words = data && Array.isArray(data.words) ? data.words : [];
  if (words.length === 0) return <EmptyState message="No terms" />;

  const weights = words.map((w) => Number(w.weight) || 0);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;

  const size = (w) => {
    const t = (Number(w) - min) / span; // 0..1
    return 12 + t * 22; // 12px .. 34px
  };
  const opacity = (w) => 0.55 + ((Number(w) - min) / span) * 0.45;

  // Sort biggest first for visual hierarchy.
  const sorted = [...words].sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0));
  const rows = data && Array.isArray(data.rows) ? data.rows : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
      <div className="wordcloud" role="list" aria-label="Word cloud">
        {sorted.map((w, i) => (
          <span
            className="word"
            role="listitem"
            key={`${w.text}-${i}`}
            title={`${w.text}: ${w.weight}`}
            style={{
              fontSize: `${size(w.weight).toFixed(0)}px`,
              opacity: opacity(w.weight),
              color: PALETTE[i % PALETTE.length],
            }}
          >
            {w.text}
          </span>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="w-table-wrap" style={{ maxHeight: 120 }}>
          <table className="w-table">
            <thead>
              <tr>
                {Object.keys(rows[0]).map((k) => (
                  <th key={k} scope="col">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {Object.keys(rows[0]).map((k) => (
                    <td key={k}>{r[k] === null || r[k] === undefined ? '—' : String(r[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
