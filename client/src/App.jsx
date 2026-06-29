import React from 'react';
import { useAuth } from './auth/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Minimal "routing": choose Login vs Dashboard based on auth state.
export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-boot" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Loading The Operations Dashboard…</p>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}
