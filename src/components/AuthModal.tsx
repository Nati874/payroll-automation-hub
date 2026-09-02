import React, { useState } from 'react';
import { Mail, Key, ShieldCheck, AlertCircle, Server, CheckCircle, ArrowRight } from 'lucide-react';
import { loginApi, setAuthSession, getBackendBaseUrl, setCustomBackendUrl, type AuthUser } from '../utils/api';

interface AuthModalProps {
  onSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [backendUrl, setBackendUrl] = useState(getBackendBaseUrl());
  const [urlSaved, setUrlSaved] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await loginApi(email.trim(), password);
      if (res.success && res.token && res.user) {
        setAuthSession(res.token, res.user);
        onSuccess(res.user);
      } else {
        setErrorMsg(res.message || 'Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(`Server connection error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBackendUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomBackendUrl(backendUrl);
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 3000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--color-border)',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 16px -4px rgba(15, 23, 42, 0.2)',
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a' }}>
            Payroll Hub Security Check
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Sign in to access your unified voter database and cloud automation tools.
          </p>
        </div>

        {errorMsg && (
          <div
            className="warning-banner"
            style={{
              marginBottom: '18px',
              padding: '10px 14px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} /> Email Address
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="e.g. admin@payroll.hub"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} /> Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              marginTop: '8px',
              padding: '12px',
              fontSize: '0.95rem',
              fontWeight: 700,
              width: '100%',
              justifyContent: 'center',
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              'Authenticating...'
            ) : (
              <>
                <span>Sign In to Unified Hub</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Server size={12} />
            <span>{showServerConfig ? 'Hide Backend Endpoint' : 'Configure Backend Server'}</span>
          </button>

          {showServerConfig && (
            <div style={{ marginTop: '12px', textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  Unified Backend Server URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    placeholder="https://payroll-automation-hub.onrender.com"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    onClick={handleSaveBackendUrl}
                  >
                    Save
                  </button>
                </div>
                {urlSaved && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <CheckCircle size={12} /> Server endpoint updated.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
