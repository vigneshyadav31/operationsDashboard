import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { EmptyState, fmtNum } from './_shared.jsx';

// widgetData: { candles:[{t,o,h,l,c}], news?:[{title}] }
// Approximate candlesticks with recharts: a thin "wick" bar (low->high) and a thick
// "body" bar (open<->close), each rendered via a floating bar [start,end] value.
const UP = '#16a34a';
const DOWN = '#dc2626';

function CandleTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="recharts-default-tooltip" style={{ background: '#fff', padding: '6px 9px' }}>
      <div style={{ fontWeight: 700 }}>{p.t}</div>
      <div style={{ fontSize: 11, color: '#5b6b7c' }}>
        O {fmtNum(p.o)} · H {fmtNum(p.h)} · L {fmtNum(p.l)} · C {fmtNum(p.c)}
      </div>
    </div>
  );
}

export default function CandlestickW({ data }) {
  if (!data) return <EmptyState />;
  const candles = Array.isArray(data.candles) ? data.candles : [];
  const news = Array.isArray(data.news) ? data.news : [];

  const rows = candles
    .map((c) => {
      const o = Number(c.o);
      const h = Number(c.h);
      const l = Number(c.l);
      const cl = Number(c.c);
      if (![o, h, l, cl].every(Number.isFinite)) return null;
      return {
        t: c.t,
        o,
        h,
        l,
        c: cl,
        wick: [l, h],
        body: [Math.min(o, cl), Math.max(o, cl)],
        up: cl >= o,
      };
    })
    .filter(Boolean);

  if (rows.length === 0) {
    // No candle data — still show news if present.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <EmptyState message="No price data" />
        {news.length > 0 && (
          <ul className="news-list">
            {news.slice(0, 4).map((n, i) => (
              <li key={i}>{n.title}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const lows = rows.map((r) => r.l);
  const highs = rows.map((r) => r.h);
  const domain = [Math.min(...lows), Math.max(...highs)];
  const pad = (domain[1] - domain[0]) * 0.05 || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
      <div className="chart-box" style={{ minHeight: 160 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }} barGap={-8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#5b6b7c' }} minTickGap={16} />
            <YAxis
              domain={[domain[0] - pad, domain[1] + pad]}
              tick={{ fontSize: 11, fill: '#5b6b7c' }}
              width={48}
              allowDecimals
            />
            <Tooltip content={<CandleTooltip />} />
            {/* Wick: thin full-range bar */}
            <Bar dataKey="wick" barSize={2} isAnimationActive={false}>
              {rows.map((r, i) => (
                <Cell key={`w-${i}`} fill={r.up ? UP : DOWN} />
              ))}
            </Bar>
            {/* Body: thick open-close bar */}
            <Bar dataKey="body" barSize={10} isAnimationActive={false} radius={1}>
              {rows.map((r, i) => (
                <Cell key={`b-${i}`} fill={r.up ? UP : DOWN} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {news.length > 0 && (
        <ul className="news-list" aria-label="Related news">
          {news.slice(0, 4).map((n, i) => (
            <li key={i}>{n.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
