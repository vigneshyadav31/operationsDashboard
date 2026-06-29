import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { EmptyState } from './_shared.jsx';

// widgetData: { points:[{x,y,r,label}], xLabel, yLabel }
function BubbleTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="recharts-default-tooltip" style={{ background: '#fff', padding: '6px 9px' }}>
      <div style={{ fontWeight: 700 }}>{p.label || 'Point'}</div>
      <div style={{ fontSize: 11, color: '#5b6b7c' }}>
        x: {p.x} · y: {p.y} · size: {p.r}
      </div>
    </div>
  );
}

export default function BubbleW({ data }) {
  const points = data && Array.isArray(data.points) ? data.points : [];
  const clean = points
    .map((p) => ({
      x: Number(p.x),
      y: Number(p.y),
      r: Number(p.r) || 1,
      label: p.label,
    }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (clean.length === 0) return <EmptyState />;

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%" minHeight={180}>
        <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis
            type="number"
            dataKey="x"
            name={data.xLabel || 'x'}
            tick={{ fontSize: 11, fill: '#5b6b7c' }}
            label={
              data.xLabel
                ? { value: data.xLabel, position: 'insideBottom', offset: -4, fontSize: 11, fill: '#8a98a8' }
                : undefined
            }
          />
          <YAxis
            type="number"
            dataKey="y"
            name={data.yLabel || 'y'}
            width={44}
            tick={{ fontSize: 11, fill: '#5b6b7c' }}
            label={
              data.yLabel
                ? { value: data.yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#8a98a8' }
                : undefined
            }
          />
          <ZAxis type="number" dataKey="r" range={[60, 600]} name="size" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<BubbleTooltip />} />
          <Scatter data={clean} fill="#2563eb" fillOpacity={0.55} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
