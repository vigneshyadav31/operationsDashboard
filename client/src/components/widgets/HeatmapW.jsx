import React from 'react';
import { heatColor, fmtNum, EmptyState } from './_shared.jsx';

// widgetData: { xLabels:[...], yLabels:[...], cells:[{x,y,value}] }
// x and y index into xLabels / yLabels.
export default function HeatmapW({ data }) {
  if (!data) return <EmptyState />;
  const xLabels = Array.isArray(data.xLabels) ? data.xLabels : [];
  const yLabels = Array.isArray(data.yLabels) ? data.yLabels : [];
  const cells = Array.isArray(data.cells) ? data.cells : [];
  if (xLabels.length === 0 || yLabels.length === 0 || cells.length === 0) {
    return <EmptyState />;
  }

  const values = cells.map((c) => Number(c.value)).filter((n) => Number.isFinite(n));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  // Map (x,y) -> value for quick lookup.
  const lookup = new Map();
  cells.forEach((c) => lookup.set(`${c.x},${c.y}`, c.value));

  // grid columns: 1 (y label) + xLabels
  const gridTemplate = `minmax(48px, auto) repeat(${xLabels.length}, 1fr)`;

  return (
    <div className="heatmap">
      <div
        className="heatmap-grid"
        style={{ gridTemplateColumns: gridTemplate }}
        role="table"
        aria-label="Heatmap"
      >
        {/* header row */}
        <div aria-hidden="true" />
        {xLabels.map((xl, xi) => (
          <div className="heatmap-axis-x" key={`xh-${xi}`} title={String(xl)}>
            {xl}
          </div>
        ))}

        {yLabels.map((yl, yi) => (
          <React.Fragment key={`row-${yi}`}>
            <div className="heatmap-axis-y" title={String(yl)}>
              {yl}
            </div>
            {xLabels.map((_, xi) => {
              const raw = lookup.get(`${xi},${yi}`);
              const has = raw !== undefined && raw !== null && Number.isFinite(Number(raw));
              const t = has ? (Number(raw) - min) / span : 0;
              return (
                <div
                  key={`c-${xi}-${yi}`}
                  className="heatmap-cell"
                  style={{ background: has ? heatColor(t) : 'var(--surface-inset)' }}
                  title={`${yl} · ${xLabels[xi]}: ${has ? fmtNum(raw) : 'n/a'}`}
                  role="cell"
                  aria-label={`${yl}, ${xLabels[xi]}: ${has ? fmtNum(raw) : 'no data'}`}
                >
                  {has ? fmtNum(raw, 0) : ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="heatmap-legend" aria-hidden="true">
        <span>{fmtNum(min, 0)}</span>
        <span className="scale" />
        <span>{fmtNum(max, 0)}</span>
      </div>
    </div>
  );
}
