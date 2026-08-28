import React from 'react';
import { DollarSign, RefreshCw, Download, Plus, FileSpreadsheet } from 'lucide-react';
import type { GoogleApiConfig } from '../types';

interface GlobalSettingsProps {
  exchangeRate: number;
  setExchangeRate: (val: number) => void;
  exportBackupJSON: () => void;
  importBackupJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  googleConfig: GoogleApiConfig;
  setGoogleConfig: React.Dispatch<React.SetStateAction<GoogleApiConfig>>;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  exchangeRate,
  setExchangeRate,
  exportBackupJSON,
  importBackupJSON,
  googleConfig,
  setGoogleConfig
}) => {
  return (
    <div>
      <header className="view-header">
        <div className="header-title-area">
          <h2>Global Settings</h2>
          <p>Configure exchange rates, cloud integrations, and JSON database backups.</p>
        </div>
      </header>

      <div className="grid-2">
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
            Database Backup & Restoration
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Since your database is saved securely in local browser storage, we recommend downloading periodic backups to secure your mappings.
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
