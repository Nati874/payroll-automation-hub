import React from 'react';
import { Wallet, Users, Mail, Settings, RefreshCw } from 'lucide-react';

interface SidebarProps {
  activeTab: 'payroll' | 'database' | 'emails' | 'automation' | 'settings';
  setActiveTab: (tab: 'payroll' | 'database' | 'emails' | 'automation' | 'settings') => void;
  exchangeRate: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  exchangeRate
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

        <div className="sidebar-footer">
          <div className="rate-badge">
            <span>Exchange Rate</span>
            <strong>{exchangeRate} ETB/$</strong>
          </div>
        </div>
      </nav>
    </aside>
  );
};
