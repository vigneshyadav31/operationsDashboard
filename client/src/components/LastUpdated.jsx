import React, { useEffect, useState } from 'react';

// Renders a relative ("3m ago") + absolute (full timestamp on hover/title) time.
// Re-renders every 30s so the relative label stays accurate.
function relative(iso) {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 0) return 'just now';
  if (secs < 45) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export default function LastUpdated({ iso, prefix = 'Updated' }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const absolute = iso ? new Date(iso).toLocaleString() : 'No data yet';

  return (
    <time
      className="last-updated"
      dateTime={iso || undefined}
      title={absolute}
      aria-label={`${prefix} ${relative(iso)} (${absolute})`}
    >
      {prefix} {relative(iso)}
    </time>
  );
}
