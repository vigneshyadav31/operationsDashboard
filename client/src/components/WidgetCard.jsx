import React from 'react';
import WidgetRenderer from './WidgetRenderer.jsx';
import LastUpdated from './LastUpdated.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {

    console.error('Widget render error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="w-error" role="alert">
          <span className="w-state-icon" aria-hidden="true">
            ⚠
          </span>
          <span>This widget failed to render.</span>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            {String(this.state.error.message || this.state.error)}
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}

function StatusPill({ status }) {
  const s = status || 'stale';
  return (
    <span className={`pill ${s}`} aria-label={`Status: ${s}`}>
      {s}
    </span>
  );
}

export default function WidgetCard({ payload, onRefresh, refreshing }) {
  const { user } = useAuth();
  const role = user?.role || 'analyst';
  const canRefresh = role === 'founder' || role === 'admin';

  const { widget = {}, status, data, lastUpdated, error, category, sensitive } = payload || {};
  const question = widget.question || 'refresh';
  const isRestricted = status === 'restricted';

  return (
    <article className="card" aria-label={widget.title || payload?.name}>
      <div className="card-head">
        <div className="card-head-main">
          <div className="card-title">
            {sensitive ? (
              <span title="Sensitive widget" aria-label="Sensitive" aria-hidden="true">
                🔒
              </span>
            ) : null}
            {widget.title || payload?.name || 'Widget'}
          </div>
          {widget.description ? <div className="card-desc">{widget.description}</div> : null}
          <div className="card-badges">
            <span className={`badge q-${question}`}>{question}</span>
            {category ? <span className="badge cat">{category}</span> : null}
            <StatusPill status={status} />
          </div>
        </div>
        {canRefresh && !isRestricted ? (
          <button
            className="btn btn-sm btn-ghost"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={`Refresh ${widget.title || 'widget'}`}
            title="Refresh this widget"
          >
            {refreshing ? '…' : '↻'}
          </button>
        ) : null}
      </div>

      <div className="card-body">
        {isRestricted ? (
          <div className="w-restricted" role="status">
            <span className="w-state-icon" aria-hidden="true">
              🔒
            </span>
            <strong>Restricted</strong>
            <span style={{ fontSize: 12 }}>
              This sensitive widget is visible to founders and admins only.
            </span>
          </div>
        ) : status === 'error' && !data ? (
          <div className="w-error" role="alert">
            <span className="w-state-icon" aria-hidden="true">
              ⚠
            </span>
            <span>{error || 'Data temporarily unavailable.'}</span>
          </div>
        ) : (
          <WidgetErrorBoundary>
            <WidgetRenderer
              type={widget.type}
              data={data}
              meta={{ ...widget, metrics: payload?.metrics }}
            />
          </WidgetErrorBoundary>
        )}
      </div>

      <div className="card-foot">
        <LastUpdated iso={lastUpdated} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{payload?.id}</span>
      </div>
    </article>
  );
}
