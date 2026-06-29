import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { PALETTE, EmptyState } from './_shared.jsx';

// widgetData: { series:[{name,points:[{x,y}]}], xLabel, yLabel }  (line + multiline)
// Merge series into a single row set keyed by x so recharts can render multiple lines.
export default function LineW({ data }) {
  const series = data && Array.isArray(data.series) ? data.series : [];
  const usable = series.filter((s) => Array.isArray(s.points) && s.points.length > 0);
  if (usable.length === 0) return <EmptyState />;

  const xKeys = [];
  const rowMap = new Map();
  usable.forEach((s) => {
    s.points.forEach((p) => {
      const x = p.x;
      if (!rowMap.has(x)) {
        rowMap.set(x, { x });
        xKeys.push(x);
      }
      rowMap.get(x)[s.name] = Number(p.y);
    });
  });
  const rows = xKeys.map((x) => rowMap.get(x));

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%" minHeight={180}>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 11, fill: '#5b6b7c' }}
            label={
              data.xLabel
                ? { value: data.xLabel, position: 'insideBottom', offset: -2, fontSize: 11, fill: '#8a98a8' }
                : undefined
            }
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#5b6b7c' }}
            width={44}
            label={
              data.yLabel
                ? { value: data.yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#8a98a8' }
                : undefined
            }
          />
          <Tooltip />
          {usable.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {usable.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
