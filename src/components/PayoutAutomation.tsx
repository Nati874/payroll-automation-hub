import React from 'react';
import { Settings as SettingsIcon, Download, CheckCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import type { AutomationRecord, AutomationLog } from '../utils/automation';

interface PayoutAutomationProps {
  // Config
  autoSpreadsheetId: string;
  setAutoSpreadsheetId: (val: string) => void;
  autoRange: string;
  setAutoRange: (val: string) => void;
  autoTargetUrl: string;
  setAutoTargetUrl: (val: string) => void;
  autoAuthHeader: string;
  setAutoAuthHeader: (val: string) => void;
  autoDelay: number;
  setAutoDelay: (val: number) => void;
  autoRunMethod: 'client' | 'backend';
  setAutoRunMethod: (val: 'client' | 'backend') => void;
  autoBackendUrl: string;
  setAutoBackendUrl: (val: string) => void;

  // Runtime states
  autoRecords: AutomationRecord[];
  autoLogs: AutomationLog[];
  isFetchingSheet: boolean;
  isRunningAutomation: boolean;
  autoCurrentIdx: number;

  // Actions
  handleFetchAutoSheet: () => void;
  handleRunAutomation: () => void;
}

export const PayoutAutomation: React.FC<PayoutAutomationProps> = ({
  autoSpreadsheetId,
  setAutoSpreadsheetId,
  autoRange,
  setAutoRange,
  autoTargetUrl,
  setAutoTargetUrl,
  autoAuthHeader,
  setAutoAuthHeader,
  autoDelay,
  setAutoDelay,
  autoRunMethod,
  setAutoRunMethod,
  autoBackendUrl,
  setAutoBackendUrl,
  autoRecords,
  autoLogs,
  isFetchingSheet,
  isRunningAutomation,
  autoCurrentIdx,
  handleFetchAutoSheet,
  handleRunAutomation
}) => {
  return (
    <div>
      <header className="view-header">
        <div className="header-title-area">
          <h2>Payout Automation Runner</h2>
          <p>Read paid records from Google Sheets and sequentially sync them to your admin portal.</p>
        </div>
      </header>

      <div className="grid-2">
        {/* Configuration panel */}
        <div className="glass-panel">
          <div className="glass-panel-title">
            <SettingsIcon size={18} /> Configuration Settings
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Run Method</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="runMethod"
                  value="client"
                  checked={autoRunMethod === 'client'}
                  onChange={() => setAutoRunMethod('client')}
                />
                <span>Client-Side (Direct Fetch)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="runMethod"
                  value="backend"
                  checked={autoRunMethod === 'backend'}
                  onChange={() => setAutoRunMethod('backend')}
                />
                <span style={{ fontWeight: autoRunMethod === 'backend' ? 'bold' : 'normal' }}>
                  Local Backend Proxy Server (Recommended)
                </span>
              </label>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
              Use the Local Backend server to bypass browser CORS security limitations and run automated programmatic session logins.
            </span>
          </div>

          {autoRunMethod === 'backend' && (
            <div className="form-group mb-4">
              <label className="form-label">Backend Proxy Server URL</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. http://localhost:3001 or your-service.onrender.com"
                value={autoBackendUrl}
                onChange={(e) => setAutoBackendUrl(e.target.value)}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                The address of your running local Node server or deployed Render proxy.
              </span>
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Google Spreadsheet ID</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter sheet ID..."
              value={autoSpreadsheetId}
              onChange={(e) => setAutoSpreadsheetId(e.target.value)}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Spreadsheet where voter/payment records are kept.
            </span>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Sheet Range</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Sheet1!A1:E100"
                value={autoRange}
                onChange={(e) => setAutoRange(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Request Delay (ms)</label>
              <input
                type="number"
                className="input-field"
                value={autoDelay}
                onChange={(e) => setAutoDelay(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Target Automation Server Endpoint</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. https://preferencestudy.com/api/admin/payouts"
              value={autoTargetUrl}
              onChange={(e) => setAutoTargetUrl(e.target.value)}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              API endpoint to receive payout registration payloads.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Authorization Token / Headers</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Bearer your_admin_api_token"
              value={autoAuthHeader}
              onChange={(e) => setAutoAuthHeader(e.target.value)}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Bearer session token. Optional if backend credentials are configured inside the server `.env` file.
            </span>
          </div>

          <div className="flex-gap-sm mt-4">
            <button
              className="btn btn-primary"
              disabled={isFetchingSheet || isRunningAutomation}
              onClick={handleFetchAutoSheet}
            >
              {isFetchingSheet ? <RefreshCw size={16} className="spinning" /> : <Download size={16} />}
              Fetch & Scan Sheet
            </button>
            <button
              className={`btn ${autoRecords.length > 0 && !isRunningAutomation ? 'btn-success' : 'btn-disabled'}`}
              disabled={autoRecords.length === 0 || isRunningAutomation}
              onClick={handleRunAutomation}
            >
              <CheckCircle size={16} /> Run Payout Automation
            </button>
          </div>
        </div>

        {/* Progress and Logs Console panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="glass-panel-title">
            <RefreshCw size={18} /> Automation Console
          </div>

          {autoRecords.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div className="flex-between mb-2">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Progress:</span>
                <strong style={{ fontSize: '0.9rem' }}>
                  {autoCurrentIdx} / {autoRecords.length} processed ({Math.round((autoCurrentIdx / autoRecords.length) * 100)}%)
                </strong>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(autoCurrentIdx / autoRecords.length) * 100}%`,
                    height: '100%',
                    background: 'var(--primary-gradient)',
                    transition: 'width 0.3s ease-out'
                  }}
                />
              </div>
            </div>
          )}

          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#e2e8f0',
              flexGrow: 1,
              overflowY: 'auto',
              minHeight: '300px',
              maxHeight: '400px',
              border: '1px solid var(--panel-border)'
            }}
          >
            {autoLogs.length === 0 ? (
              <span style={{ color: 'var(--text-dim)' }}>Console ready. Awaiting trigger...</span>
            ) : (
              autoLogs.map((log, index) => {
                let color = '#94a3b8'; // info
                if (log.type === 'success') color = '#34d399';
                if (log.type === 'error') color = '#f87171';

                return (
                  <div key={index} style={{ marginBottom: '8px', lineBreak: 'anywhere' }}>
                    <span style={{ color: 'var(--text-dim)', marginRight: '8px' }}>[{log.timestamp}]</span>
                    <span style={{ color }}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Scanned Records List */}
      {autoRecords.length > 0 && (
        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div className="glass-panel-title">
            <FileSpreadsheet size={18} /> Detected Paid Payout Rows ({autoRecords.length})
          </div>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Row #</th>
                  <th>Voter Email</th>
                  <th>Full Name</th>
                  <th>AmountUSD</th>
                  <th>Action Status</th>
                </tr>
              </thead>
              <tbody>
                {autoRecords.map((rec, index) => {
                  let statusText = 'Pending';
                  let statusColor = 'var(--text-dim)';
                  if (index < autoCurrentIdx) {
                    statusText = 'Completed';
                    statusColor = 'var(--color-success)';
                  } else if (index === autoCurrentIdx && isRunningAutomation) {
                    statusText = 'Processing...';
                    statusColor = 'var(--color-warning)';
                  }

                  return (
                    <tr key={index}>
                      <td>{rec.rowNumber}</td>
                      <td style={{ fontWeight: 600 }}>{rec.email}</td>
                      <td>{rec.name}</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                        ${rec.amount.toFixed(2)}
                      </td>
                      <td style={{ color: statusColor, fontWeight: 600 }}>{statusText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
