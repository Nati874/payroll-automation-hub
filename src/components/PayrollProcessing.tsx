import React from 'react';
import {
  FileSpreadsheet,
  AlertTriangle,
  Info,
  DollarSign,
  Wallet,
  Settings as SettingsIcon,
  Download
} from 'lucide-react';
import type { PayoutRecord } from '../types';
import { parseSmartPayoutCommand } from '../utils/parser';

interface PayrollProcessingProps {
  rawPayrollText: string;
  setRawPayrollText: (val: string) => void;
  handleParsePayroll: () => void;
  parsedRecords: PayoutRecord[];
  setParsedRecords: React.Dispatch<React.SetStateAction<PayoutRecord[]>>;
  activeRecords: PayoutRecord[];
  payoutMode: 'all' | 'half' | 'cap';
  setPayoutMode: (val: 'all' | 'half' | 'cap') => void;
  payoutCap: number;
  setPayoutCap: (val: number) => void;
  toggleRecordSelect: (index: number) => void;
  selectAllVisible: (val: boolean) => void;
  totals: {
    totalUSD: number;
    selectedUSD: number;
    selectedETB: number;
    unlinkedCount: number;
  };
  exchangeRate: number;
  flaggedSet: Set<string>;
  triggerQuickAdd: (email: string, name: string) => void;
  handleExportExcel: () => void;
  handleExportGoogleSheet: () => void;
  prioritizeRotation: boolean;
  setPrioritizeRotation: (val: boolean) => void;
}

export const PayrollProcessing: React.FC<PayrollProcessingProps> = ({
  rawPayrollText,
  setRawPayrollText,
  handleParsePayroll,
  parsedRecords,
  setParsedRecords,
  activeRecords,
  payoutMode,
  setPayoutMode,
  payoutCap,
  setPayoutCap,
  toggleRecordSelect,
  selectAllVisible,
  totals,
  exchangeRate,
  flaggedSet,
  triggerQuickAdd,
  handleExportExcel,
  handleExportGoogleSheet,
  prioritizeRotation,
  setPrioritizeRotation
}) => {
  const [plannerCommand, setPlannerCommand] = React.useState('');
  const [plannerLog, setPlannerLog] = React.useState('');

  const handleRunPlanner = () => {
    if (!plannerCommand.trim()) return;
    const { records: updated, log } = parseSmartPayoutCommand(
      plannerCommand,
      parsedRecords,
      exchangeRate
    );
    setParsedRecords(updated);
    setPlannerLog(log);
  };
  return (
    <div>
      <header className="view-header">
        <div className="header-title-area">
          <h2>Payroll Processing</h2>
          <p>Paste admin output text to parse, analyze, and queue automated bank payments.</p>
        </div>
      </header>

      <div className="glass-panel">
        <div className="glass-panel-title">
          <FileSpreadsheet size={20} className="nav-icon" />
          Raw Clipboard Input
        </div>
        <div className="form-group">
          <label className="form-label">Paste preferencestudy.com admin logs here</label>
          <textarea
            className="textarea-field"
            placeholder={`Example Input:\n\nEmnet Hailu\nemnethailu1995@gmail.com\n8571\nValid\n25\nRecordings\n$1293.15\nEarned\n$527.70\nPaid\n0\nFlagged\n$765.45\nOwed\nRecord Payment\nHistory`}
            value={rawPayrollText}
            onChange={(e) => setRawPayrollText(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={handleParsePayroll}>
            Parse Payroll Text
          </button>
          {parsedRecords.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setParsedRecords([])}>
              Clear Grid
            </button>
          )}
        </div>

        {/* Visual Bookmarklet Guide */}
        <div
          className="warning-banner"
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
            borderColor: 'rgba(99, 102, 241, 0.2)',
            color: '#818cf8',
            marginTop: '16px',
          }}
        >
          <Info size={16} />
          <span>
            <strong>1-Click Scraper Bookmarklet:</strong> Drag this link to your browser bookmark bar:{' '}
            <a
              href="javascript:(function(){const text=window.getSelection().toString()||document.body.innerText;navigator.clipboard.writeText(text).then(()=>{alert('Page text copied successfully! Now paste it in the Raw Clipboard Input in the Payroll Hub.')}).catch(err=>{alert('Failed to copy text: '+err)});})()"
              style={{ color: '#a5b4fc', fontWeight: 'bold', textDecoration: 'underline' }}
              onClick={(e) => e.preventDefault()}
            >
              Scrape Payment Info
            </a>. Then, click it on your admin page to auto-copy the tables.
          </span>
        </div>
      </div>

      {activeRecords.length > 0 && (
        <div>
          {/* Stats Panel */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <DollarSign size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  ${totals.selectedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="stat-label">USD Payout Sum</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon success">
                <Wallet size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {totals.selectedETB.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB
                </span>
                <span className="stat-label">ETB Payout Sum</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon warning">
                <AlertTriangle size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{totals.unlinkedCount}</span>
                <span className="stat-label">Unlinked Bank Accounts</span>
              </div>
            </div>
          </div>

          {/* Filters and options panel */}
          <div className="glass-panel">
            <div className="glass-panel-title">
              <SettingsIcon size={18} />
              Customize Payout Rules
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Payout Selection Method</label>
                <select
                  className="select-field"
                  value={payoutMode}
                  onChange={(e: any) => setPayoutMode(e.target.value)}
                >
                  <option value="all">Pay Full Amount (Default)</option>
                  <option value="half">Pay Half (Scale 50%)</option>
                  <option value="cap">Cap Total Payout (Lowest Owed First)</option>
                </select>
              </div>

              {payoutMode === 'cap' && (
                <div className="form-group">
                  <label className="form-label">Payout Cap (USD)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={payoutCap}
                    onChange={(e) => setPayoutCap(Number(e.target.value))}
                  />
                </div>
              )}

              <div className="form-group" style={{ justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '16px' }}>
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={prioritizeRotation}
                    onChange={(e) => setPrioritizeRotation(e.target.checked)}
                  />
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                    Prioritize Rotational Queue (Unpaid First)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Smart Payout Planner Console */}
          <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-success)' }}>
            <div className="glass-panel-title">
              <Wallet size={18} className="nav-icon" style={{ color: 'var(--color-success)' }} />
              Smart Payout Planner (AI-Style)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Type instructions to automatically calculate and select payouts. (e.g. <i>"pay 25 people $100 each"</i>, <i>"split $3000 evenly"</i>, or <i>"distribute $5000 proportional to owed"</i>).
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. split $5000 evenly among 37 people"
                  value={plannerCommand}
                  onChange={(e) => setPlannerCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRunPlanner();
                  }}
                />
                <button className="btn btn-success" onClick={handleRunPlanner}>
                  Apply Command
                </button>
              </div>
              {plannerLog && (
                <div className="success-banner" style={{ margin: '8px 0 0 0', padding: '12px 16px' }}>
                  <Info size={16} />
                  <span>{plannerLog}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payroll Preview Table */}
          <div className="glass-panel">
            <div className="flex-between mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Generated Payout Table</h3>
              <div className="flex-gap-sm">
                <button className="btn btn-secondary" onClick={() => selectAllVisible(true)}>
                  Select All
                </button>
                <button className="btn btn-secondary" onClick={() => selectAllVisible(false)}>
                  Deselect All
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th className="checkbox-cell">Pay</th>
                    <th>Parsed Name</th>
                    <th>Email</th>
                    <th>Database Full Name</th>
                    <th>Bank Details</th>
                    <th>Owed (USD)</th>
                    <th>Owed (ETB)</th>
                    <th>Payout USD</th>
                    <th>Payout ETB</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.map((item, index) => {
                    const isLinked = !!item.bankAccount;
                    const factor = payoutMode === 'half' ? 0.5 : 1;
                    const isFlagged = flaggedSet.has(item.email.toLowerCase());

                    return (
                      <tr key={index} style={isFlagged ? { opacity: 0.4 } : {}}>
                        <td className="checkbox-cell">
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={item.selected}
                            disabled={isFlagged}
                            onChange={() => toggleRecordSelect(index)}
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td>{item.email}</td>
                        <td>
                          {item.fullNameDB ? (
                            item.fullNameDB
                          ) : (
                            <span style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={14} /> Unlinked
                            </span>
                          )}
                        </td>
                        <td>
                          {isLinked ? (
                            <div className="flex-gap-sm">
                              <span
                                className={`badge ${
                                  item.bankType === 'Telebirr' ? 'badge-telebirr' : 'badge-cbe'
                                }`}
                              >
                                {item.bankType}
                              </span>
                              <span style={{ fontFamily: 'monospace' }}>{item.bankAccount}</span>
                            </div>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '8px' }}
                              onClick={() => triggerQuickAdd(item.email, item.name)}
                            >
                              Link Bank
                            </button>
                          )}
                        </td>
                        <td>${item.owed.toFixed(2)}</td>
                        <td>{(item.owed * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 1 })} ETB</td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                          ${(item.owed * factor).toFixed(2)}
                        </td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                          {((item.owed * factor) * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 1 })} ETB
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex-gap-md" style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={handleExportExcel}>
                <Download size={18} />
                Download Excel File
              </button>
              <button className="btn btn-success" onClick={handleExportGoogleSheet}>
                <FileSpreadsheet size={18} />
                Append to Google Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
