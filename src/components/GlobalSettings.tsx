import React, { useState } from 'react';
import {
  DollarSign,
  RefreshCw,
  Download,
  Plus,
  FileSpreadsheet,
  Shield,
  Cloud,
  CheckCircle,
  AlertCircle,
  Lock
} from 'lucide-react';
import type { GoogleApiConfig } from '../types';
import {
  changePasswordApi,
  getBackendBaseUrl,
  setCustomBackendUrl,
  type AuthUser
} from '../utils/api';

interface GlobalSettingsProps {
  exchangeRate: number;
  setExchangeRate: (val: number) => void;
  exportBackupJSON: () => void;
  importBackupJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  googleConfig: GoogleApiConfig;
  setGoogleConfig: React.Dispatch<React.SetStateAction<GoogleApiConfig>>;
  currentUser?: AuthUser | null;
  onManualSyncToCloud?: () => Promise<void>;
  onManualPullFromCloud?: () => Promise<void>;
  isSyncingCloud?: boolean;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  exchangeRate,
  setExchangeRate,
  exportBackupJSON,
  importBackupJSON,
  googleConfig,
  setGoogleConfig,
  currentUser,
  onManualSyncToCloud,
  onManualPullFromCloud,
  isSyncingCloud = false,
}) => {
  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Backend URL state
  const [customUrl, setCustomUrl] = useState(getBackendBaseUrl());
  const [urlMsg, setUrlMsg] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await changePasswordApi(currentPassword, newPassword);
      if (res.success) {
        setPwdMsg({ type: 'success', text: 'Password updated successfully for this account.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdMsg({ type: 'error', text: res.message || 'Failed to update password.' });
      }
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message });
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomBackendUrl(customUrl);
    setUrlMsg(true);
    setTimeout(() => setUrlMsg(false), 3000);
  };

  return (
    <div>
      <header className="view-header">
        <div className="header-title-area">
          <h2>Global Settings</h2>
          <p>Configure exchange rates, cloud database synchronization, account security, and integrations.</p>
        </div>
      </header>

      <div className="grid-2">
        {/* Unified Cloud Database Sync Card */}
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div className="glass-panel-title">
            <Cloud size={18} style={{ color: 'var(--color-success)' }} />
            Unified Cloud Database Sync
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            All voters, divisions, and configurations are automatically synchronized across devices and browsers in real-time.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {onManualSyncToCloud && (
              <button
                className="btn btn-success"
                onClick={onManualSyncToCloud}
                disabled={isSyncingCloud}
                style={{ fontSize: '0.85rem' }}
              >
                <RefreshCw size={14} className={isSyncingCloud ? 'spin' : ''} />
                {isSyncingCloud ? 'Syncing...' : 'Push to Cloud Now'}
              </button>
            )}

            {onManualPullFromCloud && (
              <button
                className="btn btn-secondary"
                onClick={onManualPullFromCloud}
                disabled={isSyncingCloud}
                style={{ fontSize: '0.85rem' }}
              >
                <Cloud size={14} />
                Pull Latest from Cloud
              </button>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>
              Backend Server Endpoint
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                style={{ fontSize: '0.85rem' }}
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://payroll-automation-hub.onrender.com"
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                onClick={handleSaveCustomUrl}
              >
                Save
              </button>
            </div>
            {urlMsg && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <CheckCircle size={12} /> Server URL updated!
              </span>
            )}
          </div>
        </div>

        {/* Account Security & Password Change */}
        <div className="glass-panel" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="glass-panel-title">
            <Shield size={18} style={{ color: '#3b82f6' }} />
            Account Security & Password
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Logged in as: <strong>{currentUser?.email || 'admin@payroll.hub'}</strong>
          </p>

          {pwdMsg && (
            <div
              className={pwdMsg.type === 'success' ? 'success-banner' : 'warning-banner'}
              style={{ marginBottom: '14px', padding: '8px 12px', fontSize: '0.8rem' }}
            >
              {pwdMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{pwdMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Current Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="grid-2" style={{ gap: '10px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>New Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Confirm New Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              style={{ marginTop: '6px', alignSelf: 'flex-start' }}
              disabled={isChangingPwd}
            >
              <Lock size={14} />
              {isChangingPwd ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Financial Constants */}
        <div className="glass-panel">
          <div className="glass-panel-title">
            <DollarSign size={18} />
            Payroll Rate Constants
          </div>

          <div className="form-group">
            <label className="form-label">ETB Exchange Rate (1 USD = ? ETB)</label>
            <input
              type="number"
              className="input-field"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Used for calculating legal bank payout equivalents. Default: 160 ETB.
            </span>
          </div>
        </div>

        {/* Backups section */}
        <div className="glass-panel">
          <div className="glass-panel-title">
            <RefreshCw size={18} />
            Local JSON Backup & Restoration
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Download an offline JSON snapshot of your current database or import previous backup files.
          </p>

          <div className="flex-gap-md">
            <button className="btn btn-secondary" onClick={exportBackupJSON}>
              <Download size={16} />
              Download Backup JSON
            </button>

            <label className="btn btn-secondary" style={{ display: 'flex', cursor: 'pointer' }}>
              <Plus size={16} style={{ marginRight: '6px' }} />
              Restore Backup JSON
              <input
                type="file"
                accept=".json"
                onChange={importBackupJSON}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Google Integration */}
        <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
          <div className="glass-panel-title">
            <FileSpreadsheet size={18} />
            Google Sheets Integration Configuration
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Configure your Google Cloud Platform OAuth client credentials to export payroll tables directly to your designated spreadsheet.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">OAuth 2.0 Client ID</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 12345-abcde.apps.googleusercontent.com"
                  value={googleConfig.clientId}
                  onChange={(e) =>
                    setGoogleConfig((prev) => ({ ...prev, clientId: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter Google API Key..."
                  value={googleConfig.apiKey}
                  onChange={(e) => setGoogleConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Google Spreadsheet ID (Target Sheet)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                value={googleConfig.spreadsheetId}
                onChange={(e) =>
                  setGoogleConfig((prev) => ({ ...prev, spreadsheetId: e.target.value }))
                }
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                To retrieve the Spreadsheet ID, look at your Google Sheet URL:
                <code>https://docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit</code>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
