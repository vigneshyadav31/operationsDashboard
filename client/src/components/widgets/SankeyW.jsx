import React from 'react';
import { PALETTE, fmtNum, EmptyState } from './_shared.jsx';

// widgetData: { nodes:[{name}], links:[{source,target,value}] }
// Approximation: list each flow source -> target with a proportional bar.
// `source`/`target` may be node indices or names.
export default function SankeyW({ data }) {
  if (!data) return <EmptyState />;
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const links = Array.isArray(data.links) ? data.links : [];
  if (links.length === 0) return <EmptyState message="No flows" />;

  const nameOf = (ref) => {
    if (typeof ref === 'number') return nodes[ref]?.name ?? `#${ref}`;
    // allow name string directly
    return String(ref);
  };

  const values = links.map((l) => Number(l.value) || 0);
  const max = Math.max(...values) || 1;

  return (
    <div className="sankey" role="list" aria-label="Flow diagram">
      {links.map((l, i) => {
        const v = Number(l.value) || 0;
        const pct = (v / max) * 100;
        return (
          <div className="sankey-flow" role="listitem" key={i}>
            <div className="lbl">
              <span className="nodes">
                {nameOf(l.source)} <span aria-hidden="true">→</span> {nameOf(l.target)}
              </span>
              <span className="val">{fmtNum(v)}</span>
            </div>
            <div
              className="sankey-bar"
              style={{ width: `${Math.max(4, pct)}%`, background: PALETTE[i % PALETTE.length] }}
              aria-hidden="true"
            />
          </div>
        );
      })}
    </div>
  );
}
