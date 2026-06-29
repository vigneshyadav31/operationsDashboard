import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Nav from '../components/Nav.jsx';
import ActionQueue from '../components/ActionQueue.jsx';
import WidgetCard from '../components/WidgetCard.jsx';

const POLL_MS = 60000;

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || 'analyst';
  const canRefreshAll = role === 'founder' || role === 'admin';

  const [widgets, setWidgets] = useState([]);
  const [actions, setActions] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadAll = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [w, a] = await Promise.all([api.getWidgets(), api.getActions()]);
      if (!mounted.current) return;
      setWidgets(Array.isArray(w) ? w : []);
      setActions(Array.isArray(a) ? a : []);
      setLastUpdated(new Date().toISOString());
      setError('');
    } catch (err) {
      if (!mounted.current) return;
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      if (mounted.current && !silent) setLoading(false);
    }
  }, []);

  // Initial load + 60s polling.
  useEffect(() => {
    loadAll();
    const t = setInterval(() => loadAll({ silent: true }), POLL_MS);
    return () => clearInterval(t);
  }, [loadAll]);

  // Founder/admin: re-run engine + refresh server-side, then reload.
  const handleRefreshAll = useCallback(async () => {
    setRefreshingAll(true);
    try {
      if (role === 'admin') {
        await api.refreshAll();
      } else {
        // founder: refresh each non-restricted widget we can, then reload actions.
        const targets = widgets.filter((w) => w.status !== 'restricted');
        await Promise.allSettled(targets.map((w) => api.refreshWidget(w.id)));
      }
      await loadAll({ silent: true });
    } catch (err) {
      if (mounted.current) setError(err.message || 'Refresh failed.');
    } finally {
      if (mounted.current) setRefreshingAll(false);
    }
  }, [role, widgets, loadAll]);

  const handleRefreshWidget = useCallback(
    async (id) => {
      setRefreshingId(id);
      try {
        const updated = await api.refreshWidget(id);
        if (!mounted.current) return;
        setWidgets((prev) => prev.map((w) => (w.id === id ? updated : w)));
        setLastUpdated(new Date().toISOString());
        // A refresh may have created/cleared actions.
        api.getActions().then((a) => mounted.current && setActions(Array.isArray(a) ? a : [])).catch(() => {});
      } catch (err) {
        if (mounted.current) setError(err.message || 'Widget refresh failed.');
      } finally {
        if (mounted.current) setRefreshingId(null);
      }
    },
    []
  );

  const handleAck = useCallback(async (id) => {
    const updated = await api.ackAction(id);
    if (mounted.current) setActions((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }, []);

  const handleResolve = useCallback(async (id) => {
    const updated = await api.resolveAction(id);
    if (mounted.current) setActions((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }, []);

  return (
    <div className="dashboard">
      <Nav lastUpdated={lastUpdated} onRefreshAll={handleRefreshAll} refreshing={refreshingAll} />

      {error && (
        <div
          className="login-error"
          role="alert"
          style={{ margin: '12px 22px 0', maxWidth: 1640 }}
        >
          {error}
        </div>
      )}

      <main className="shell">
        <div className="queue-col">
          <ActionQueue actions={actions} onAck={handleAck} onResolve={handleResolve} />
        </div>

        <section aria-label="Widgets">
          <div className="section-head">
            <h2>Operations widgets</h2>
            <span className="section-count">
              {loading ? 'loading…' : `${widgets.length} sources`}
            </span>
          </div>

          {loading && widgets.length === 0 ? (
            <div className="widget-grid" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="card"
                  style={{ minHeight: 220, opacity: 0.5 }}
                />
              ))}
            </div>
          ) : widgets.length === 0 ? (
            <div className="queue-empty">
              <div className="ico" aria-hidden="true">
                ◌
              </div>
              <strong>No widgets available</strong>
              <div>The server returned no sources.</div>
            </div>
          ) : (
            <div className="widget-grid">
              {widgets.map((w) => (
                <WidgetCard
                  key={w.id}
                  payload={w}
                  onRefresh={() => handleRefreshWidget(w.id)}
                  refreshing={refreshingId === w.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
