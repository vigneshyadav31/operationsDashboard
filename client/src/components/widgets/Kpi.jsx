import React from 'react';
import { fmtNum, Delta, EmptyState } from './_shared.jsx';

export default function Kpi({ data }) {
  if (!data || data.value === undefined || data.value === null) {
    return <EmptyState />;
  }
  return (
    <div className="kpi">
      <div className="kpi-value">
        {fmtNum(data.value)}
        {data.unit ? <span className="kpi-unit">{data.unit}</span> : null}
      </div>
      <Delta value={data.delta} unit={data.unit && data.unit.includes('%') ? '' : '%'} />
      {data.label ? <div className="kpi-label">{data.label}</div> : null}
    </div>
  );
}
