import React from 'react';
import { fmtNum, Delta, EmptyState } from './_shared.jsx';

export default function Sparkline({ data }) {
  if (!data) return <EmptyState />;
  const series = Array.isArray(data.series) ? data.series : [];

  const W = 280;
  const H = 56;
  let path = '';
  let area = '';
  let lastUp = true;

  if (series.length >= 2) {
    const vals = series.map((p) => Number(p.v)).filter((n) => Number.isFinite(n));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const step = W / (series.length - 1);
    const pts = series.map((p, i) => {
      const v = Number(p.v);
      const x = i * step;
      const y = H - 6 - ((v - min) / span) * (H - 12);
      return [x, Number.isFinite(y) ? y : H / 2];
    });
    path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    area = `${path} L${W},${H} L0,${H} Z`;
    lastUp = vals[vals.length - 1] >= vals[0];
  }

  const stroke = lastUp ? '#16a34a' : '#dc2626';

  return (
    <div className="kpi">
      <div className="kpi-value">
        {fmtNum(data.value)}
        {data.unit ? <span className="kpi-unit">{data.unit}</span> : null}
      </div>
      <Delta value={data.delta} unit="%" />
      {series.length >= 2 ? (
        <svg
          className="chart-box"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ minHeight: 56, maxHeight: 70, marginTop: 8 }}
          role="img"
          aria-label={`Trend sparkline, ${series.length} points, ${lastUp ? 'rising' : 'falling'}`}
        >
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#spark-fill)" />
          <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      ) : (
        <div className="kpi-label">Insufficient trend data</div>
      )}
    </div>
  );
}
