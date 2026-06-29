import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { PALETTE, EmptyState } from './_shared.jsx';

export default function BarW({ data }) {
  const categories = data && Array.isArray(data.categories) ? data.categories : [];
  const series = data && Array.isArray(data.series) ? data.series : [];
  if (categories.length === 0 || series.length === 0) return <EmptyState />;

  const rows = categories.map((cat, i) => {
    const row = { category: cat };
    series.forEach((s) => {
      const vals = Array.isArray(s.values) ? s.values : [];
      row[s.name] = Number(vals[i]);
    });
    return row;
  });

  const stacked = !!data.stacked;

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%" minHeight={180}>
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#5b6b7c' }} minTickGap={8} />
          <YAxis tick={{ fontSize: 11, fill: '#5b6b7c' }} width={44} />
          <Tooltip cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              stackId={stacked ? 'stack' : undefined}
              fill={PALETTE[i % PALETTE.length]}
              radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              isAnimationActive={false}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
