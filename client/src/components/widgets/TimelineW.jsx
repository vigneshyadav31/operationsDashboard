import React from 'react';
import { EmptyState } from './_shared.jsx';

// widgetData: { events:[{date,title,detail,tag}] }
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function TimelineW({ data }) {
  const events = data && Array.isArray(data.events) ? data.events : [];
  if (events.length === 0) return <EmptyState message="No events" />;

  // Sort newest first when dates are parseable.
  const sorted = [...events].sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
  });

  return (
    <ol className="timeline" aria-label="Timeline of events">
      {sorted.map((e, i) => (
        <li className="tl-item" key={`${e.title}-${i}`}>
          <span className="tl-dot" aria-hidden="true" />
          <div className="tl-date">{fmtDate(e.date)}</div>
          <div className="tl-title">{e.title || 'Event'}</div>
          {e.detail ? <div className="tl-detail">{e.detail}</div> : null}
          {e.tag ? <span className="tl-tag">{e.tag}</span> : null}
        </li>
      ))}
    </ol>
  );
}
