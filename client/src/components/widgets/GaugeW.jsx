import React from 'react';
import { fmtNum, EmptyState } from './_shared.jsx';

function polar(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx, cy, r, startFrac, endFrac) {
  const a0 = 180 + startFrac * 180;
  const a1 = 180 + endFrac * 180;
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = endFrac - startFrac > 0.5 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export default function GaugeW({ data }) {
  if (!data || data.value === undefined || data.value === null) return <EmptyState />;

  const min = Number(data.min ?? 0);
  const max = Number(data.max ?? 100);
  const value = Number(data.value);
  const span = max - min || 1;
  const frac = Math.max(0, Math.min(1, (value - min) / span));

  const W = 240;
  const H = 140;
  const cx = W / 2;
  const cy = 120;
  const r = 96;

  const thresholds = Array.isArray(data.thresholds) ? data.thresholds : [];

  let color = '#2563eb';
  const sorted = [...thresholds].sort((a, b) => Number(a.at) - Number(b.at));
  for (const th of sorted) {
    if (value >= Number(th.at)) color = th.color || color;
  }

  const segs = [];
  if (sorted.length > 0) {
    let prevFrac = 0;
    for (let i = 0; i < sorted.length; i++) {
      const startFrac = Math.max(0, Math.min(1, (Number(sorted[i].at) - min) / span));
      const nextFrac = i + 1 < sorted.length
        ? Math.max(0, Math.min(1, (Number(sorted[i + 1].at) - min) / span))
        : 1;
      if (i === 0 && startFrac > 0) {
        segs.push({ s: 0, e: startFrac, c: '#e3e8ef' });
      }
      segs.push({ s: startFrac, e: nextFrac, c: sorted[i].color || '#e3e8ef' });
      prevFrac = nextFrac;
    }
    void prevFrac;
  } else {
    segs.push({ s: 0, e: 1, c: '#e3e8ef' });
  }

  const [nx, ny] = polar(cx, cy, r - 2, 180 + frac * 180);

  const forecast = Array.isArray(data.forecast) ? data.forecast : [];

  return (
    <div className="gauge">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Gauge: ${fmtNum(value)} ${data.unit || ''} of range ${min}–${max}`}
      >
        {}
        {segs.map((sg, i) => (
          <path
            key={i}
            d={arcPath(cx, cy, r, sg.s, sg.e)}
            fill="none"
            stroke={sg.c}
            strokeWidth="14"
            strokeLinecap="butt"
            opacity="0.45"
          />
        ))}
        {}
        <path
          d={arcPath(cx, cy, r, 0, Math.max(0.001, frac))}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
        />
        {}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#14202e" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="#14202e" />
        <text x={cx - r} y={cy + 16} fontSize="9" fill="#8a98a8">
          {fmtNum(min, 0)}
        </text>
        <text x={cx + r} y={cy + 16} fontSize="9" fill="#8a98a8" textAnchor="end">
          {fmtNum(max, 0)}
        </text>
      </svg>

      <div className="gauge-readout" style={{ color }}>
        {fmtNum(value)}
        {data.unit ? <span style={{ fontSize: 15, color: 'var(--text-muted)' }}> {data.unit}</span> : null}
      </div>

      {forecast.length >= 2 && (
        <svg
          viewBox="0 0 200 28"
          preserveAspectRatio="none"
          style={{ width: '100%', maxWidth: 200, height: 28 }}
          role="img"
          aria-label="Forecast trend"
        >
          {(() => {
            const vals = forecast.map((p) => Number(p.v)).filter((n) => Number.isFinite(n));
            const fmin = Math.min(...vals);
            const fmax = Math.max(...vals);
            const fspan = fmax - fmin || 1;
            const step = 200 / (forecast.length - 1);
            const d = forecast
              .map((p, i) => {
                const x = i * step;
                const y = 26 - ((Number(p.v) - fmin) / fspan) * 22;
                return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');
            return <path d={d} fill="none" stroke="#9333ea" strokeWidth="1.6" strokeDasharray="3 2" />;
          })()}
        </svg>
      )}
      {forecast.length >= 2 && <div className="kpi-label">Forecast (dashed)</div>}
    </div>
  );
}
