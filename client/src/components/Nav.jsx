import React from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import LastUpdated from './LastUpdated.jsx';

function initials(name = '', email = '') {
  const base = (name || email || '?').trim();
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Nav({ lastUpdated, onRefreshAll, refreshing }) {
  const { user, logout } = useAuth();
  const role = user?.role || 'analyst';
  const canRefreshAll = role === 'founder' || role === 'admin';

  return (
    <header className="nav" role="banner">
      <div className="nav-brand">
        <div className="nav-logo" aria-hidden="true">
          OD
        </div>
        <div>
          <div className="nav-title">The Operations Dashboard</div>
          <div className="nav-sub">Founder&rsquo;s Office &middot; command center</div>
        </div>
      </div>

      <div className="nav-spacer" />

      <div className="nav-meta">
        <span className="nav-sub" aria-live="polite">
          <LastUpdated iso={lastUpdated} prefix="Synced" />
        </span>

        {canRefreshAll && (
          <button
            className="btn btn-sm"
            onClick={onRefreshAll}
            disabled={refreshing}
            aria-label="Refresh all widgets and re-run the trigger engine"
          >
            {refreshing ? 'Refreshing…' : 'Refresh all'}
          </button>
        )}

        <div className="nav-user">
          <span className="nav-avatar" aria-hidden="true">
            {initials(user?.name, user?.email)}
          </span>
          <span>
            <span style={{ fontWeight: 600 }}>{user?.name || user?.email}</span>{' '}
            <span className={`role-badge ${role}`}>{role}</span>
          </span>
        </div>

        <button className="btn btn-sm btn-ghost" onClick={logout} aria-label="Log out">
          Log out
        </button>
      </div>
    </header>
  );
}
