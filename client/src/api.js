// API wrapper for The Operations Dashboard.
// All requests include credentials so the HttpOnly `sid` session cookie is sent.
// Server contract is under /api (see CONTRACTS.md §5).

const BASE = '/api';

async function request(path, { method = 'GET', body, headers } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(BASE + path, opts);
  } catch (networkErr) {
    const err = new Error('Network error — is the server running?');
    err.status = 0;
    err.cause = networkErr;
    throw err;
  }

  // 204 No Content (e.g. logout) — nothing to parse.
  if (res.status === 204) return null;

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      (typeof payload === 'string' && payload) ||
      `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

// ---- Auth ----
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password } });

export const register = ({ email, password, name, role }) =>
  request('/auth/register', { method: 'POST', body: { email, password, name, role } });

export const logout = () => request('/auth/logout', { method: 'POST' });

export const me = () => request('/auth/me');

// ---- Widgets ----
export const getWidgets = () => request('/widgets');

export const getWidget = (id) => request(`/widgets/${encodeURIComponent(id)}`);

export const refreshWidget = (id) =>
  request(`/widgets/${encodeURIComponent(id)}/refresh`, { method: 'POST' });

// ---- Actions (the SOP queue) ----
export const getActions = () => request('/actions');

export const ackAction = (id) =>
  request(`/actions/${encodeURIComponent(id)}/ack`, { method: 'POST' });

export const resolveAction = (id) =>
  request(`/actions/${encodeURIComponent(id)}/resolve`, { method: 'POST' });

// ---- Triggers / health ----
export const getRules = () => request('/triggers/rules');

export const getHealth = () => request('/health');

// ---- Admin-wide refresh (engine + cache) ----
export const refreshAll = () => request('/refresh', { method: 'POST' });

export default {
  login,
  register,
  logout,
  me,
  getWidgets,
  getWidget,
  refreshWidget,
  getActions,
  ackAction,
  resolveAction,
  getRules,
  getHealth,
  refreshAll,
};
