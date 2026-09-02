import React from 'react';
import { Wallet, Users, Mail, Settings, RefreshCw, LogOut, Shield } from 'lucide-react';
import type { AuthUser } from '../utils/api';

interface SidebarProps {
  activeTab: 'payroll' | 'database' | 'emails' | 'automation' | 'settings';
  setActiveTab: (tab: 'payroll' | 'database' | 'emails' | 'automation' | 'settings') => void;
  exchangeRate: number;
  currentUser?: AuthUser | null;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  exchangeRate,
  currentUser,
  onSignOut,
}) => {
  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-icon">
          <Wallet className="nav-icon" style={{ color: 'white' }} />
        </div>
        <h1 className="brand-title">Payroll Hub</h1>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ul className="nav-list">
          <li
            className={`nav-item ${activeTab === 'payroll' ? 'active' : ''}`}
            onClick={() => setActiveTab('payroll')}
          >
            <Wallet className="nav-icon" />
            Payroll Processing
          </li>
          <li
            className={`nav-item ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => setActiveTab('database')}
          >
            <Users className="nav-icon" />
            People & Divisions
          </li>
          <li
            className={`nav-item ${activeTab === 'emails' ? 'active' : ''}`}
            onClick={() => setActiveTab('emails')}
          >
            <Mail className="nav-icon" />
            Email Formatters
          </li>
          <li
            className={`nav-item ${activeTab === 'automation' ? 'active' : ''}`}
            onClick={() => setActiveTab('automation')}
          >
            <RefreshCw className="nav-icon" />
            Payout Automation
          </li>
          <li
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="nav-icon" />
            Global Settings
          </li>
        </ul>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="rate-badge">
            <span>Exchange Rate</span>
            <strong>{exchangeRate} ETB/$</strong>
          </div>

          {currentUser && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <Shield size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                <span
                  style={{
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '120px',
                  }}
                  title={currentUser.email}
                >
                  {currentUser.email}
                </span>
              </div>
              <button
                onClick={onSignOut}
                title="Sign Out"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};
