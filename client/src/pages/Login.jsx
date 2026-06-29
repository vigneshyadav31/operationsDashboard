import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('founder@demo.local');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);

    } catch (err) {
      setError(
        err.status === 401
          ? 'Invalid email or password.'
          : err.message || 'Login failed. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  function fill(addr) {
    setEmail(addr);
    setPassword('demo1234');
    setError('');
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="nav-logo" aria-hidden="true">
            OD
          </div>
          <strong>The Operations Dashboard</strong>
        </div>
        <h1>Sign in</h1>
        <p className="sub">Access the Founder&rsquo;s Office operations command center.</p>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@demo.local"
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={busy}
            style={{ width: '100%' }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="demo-hint">
          <strong>Demo credentials</strong> — password <code>demo1234</code>
          <div className="row">
            <button type="button" className="btn btn-sm" onClick={() => fill('founder@demo.local')}>
              founder@demo.local
            </button>
            <button type="button" className="btn btn-sm" onClick={() => fill('analyst@demo.local')}>
              analyst@demo.local
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
