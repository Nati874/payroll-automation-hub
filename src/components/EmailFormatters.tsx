import React from 'react';
import { Mail, Users, Copy } from 'lucide-react';
import type { Division } from '../types';

interface EmailFormattersProps {
  rawEmailText: string;
  setRawEmailText: (val: string) => void;
  handleExtractEmails: () => void;
  divisions: Division[];
  selectedDivId: string;
  setSelectedDivId: (val: string) => void;
  getDivisionEmailsFormatted: (id: string) => string;
  copyToClipboard: (text: string) => void;
}

export const EmailFormatters: React.FC<EmailFormattersProps> = ({
  rawEmailText,
  setRawEmailText,
  handleExtractEmails,
  divisions,
  selectedDivId,
  setSelectedDivId,
  getDivisionEmailsFormatted,
  copyToClipboard
}) => {
  return (
    <div>
      <header className="view-header">
        <div className="header-title-area">
          <h2>Email Formatters</h2>
          <p>Extract unique emails from raw chat conversations, or fetch formatted list by divisions.</p>
        </div>
      </header>

      <div className="grid-2">
        {/* Email Extractor */}
        <div className="glass-panel">
          <div className="glass-panel-title">
            <Mail size={18} />
            Chat Conversation Email Extractor
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Paste raw text or group conversations. The engine will extract all unique email addresses and format them as a comma-separated list.
          </p>

          <div className="form-group">
            <label className="form-label">Conversation Text Input</label>
            <textarea
              className="textarea-field"
              placeholder="voter1@gmail.com says: hi there! voter2@gmail.com says: hello..."
              value={rawEmailText}
              onChange={(e) => setRawEmailText(e.target.value)}
              style={{ minHeight: '150px' }}
            />
          </div>

          <div className="flex-gap-md" style={{ marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleExtractEmails}>
              Extract Unique Emails
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => copyToClipboard(rawEmailText)}
              disabled={!rawEmailText.includes('@')}
            >
              <Copy size={16} /> Copy Result
            </button>
          </div>
        </div>

        {/* Division Exporter */}
        <div className="glass-panel">
          <div className="glass-panel-title">
            <Users size={18} />
            Division Email Exporter
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Select a division to immediately copy its email list. Flagged blacklisted emails will be automatically excluded.
          </p>

          <div className="form-group mb-6">
            <label className="form-label">Select Division</label>
            <select
              className="select-field"
              value={selectedDivId}
              onChange={(e) => setSelectedDivId(e.target.value)}
            >
              <option value="">-- Choose Division --</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.emails.length} members)
                </option>
              ))}
            </select>
          </div>

          {selectedDivId && (
            <div>
              <div className="form-group">
                <label className="form-label">Filtered Email List Output</label>
                <textarea
                  readOnly
                  className="textarea-field"
                  value={getDivisionEmailsFormatted(selectedDivId)}
                  style={{ minHeight: '100px', backgroundColor: 'rgba(0,0,0,0.2)' }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={() => copyToClipboard(getDivisionEmailsFormatted(selectedDivId))}
                disabled={!getDivisionEmailsFormatted(selectedDivId)}
              >
                <Copy size={16} /> Copy Division Emails
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
