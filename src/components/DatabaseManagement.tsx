import React from 'react';
import {
  Users,
  Upload,
  Save,
  Search,
  AlertTriangle,
  Trash2,
  FileSpreadsheet,
  CheckCircle,
  X,
  RotateCcw
} from 'lucide-react';
import type { Person, Division } from '../types';

interface DatabaseManagementProps {
  // Navigation
  dbSubTab: 'registry' | 'bulk' | 'batch';
  setDbSubTab: (tab: 'registry' | 'bulk' | 'batch') => void;

  // Modals state triggers
  setIsAddPersonOpen: (val: boolean) => void;
  setIsAddDivisionOpen: (val: boolean) => void;

  // General Database
  people: Person[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  filteredPeople: Person[];
  peopleSearch: string;
  setPeopleSearch: (val: string) => void;
  flaggedEmails: string[];
  flaggedSet: Set<string>;
  toggleFlaggedEmail: (email: string) => void;

  // Divisions
  divisions: Division[];
  handleRemoveDivision: (id: string) => void;
  divMemberEmail: { [divId: string]: string };
  setDivMemberEmail: React.Dispatch<React.SetStateAction<{ [divId: string]: string }>>;
  handleAddMemberToDivision: (divId: string) => void;
  handleRemoveMemberFromDivision: (divId: string, email: string) => void;

  // Bulk Import
  bulkImportMode: 'emails' | 'dictionary' | 'file';
  setBulkImportMode: (val: 'emails' | 'dictionary' | 'file') => void;
  bulkText: string;
  setBulkText: (val: string) => void;
  parsedBulkData: Partial<Person>[];
  setParsedBulkData: React.Dispatch<React.SetStateAction<Partial<Person>[]>>;
  handleBulkFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleParseBulkEmails: () => void;
  handleParseBulkDictionary: () => void;
  handleCommitBulkImport: () => void;

  // Batch Editor
  batchSearch: string;
  setBatchSearch: (val: string) => void;
  batchFilterMissingOnly: boolean;
  setBatchFilterMissingOnly: (val: boolean) => void;
  editedPeople: { [email: string]: Partial<Person> };
  setEditedPeople: React.Dispatch<React.SetStateAction<{ [email: string]: Partial<Person> }>>;
  handleBatchChange: (email: string, field: keyof Person, value: any) => void;
  handleSaveSingleRow: (email: string) => void;
  handleSaveAllChanges: () => void;
  handleDiscardAllChanges: () => void;
}

export const DatabaseManagement: React.FC<DatabaseManagementProps> = ({
  dbSubTab,
  setDbSubTab,
  setIsAddPersonOpen,
  setIsAddDivisionOpen,
  people,
  setPeople,
  filteredPeople,
  peopleSearch,
  setPeopleSearch,
  flaggedEmails,
  flaggedSet,
  toggleFlaggedEmail,
  divisions,
  handleRemoveDivision,
  divMemberEmail,
  setDivMemberEmail,
  handleAddMemberToDivision,
  handleRemoveMemberFromDivision,
  bulkImportMode,
  setBulkImportMode,
  bulkText,
  setBulkText,
  parsedBulkData,
  setParsedBulkData,
  handleBulkFileUpload,
  handleParseBulkEmails,
  handleParseBulkDictionary,
  handleCommitBulkImport,
  batchSearch,
  setBatchSearch,
  batchFilterMissingOnly,
  setBatchFilterMissingOnly,
  editedPeople,
  setEditedPeople,
  handleBatchChange,
  handleSaveSingleRow,
  handleSaveAllChanges,
  handleDiscardAllChanges
}) => {
  return (
    <div>
      <header className="view-header">
        <div className="header-title-area">
          <h2>Database Management</h2>
          <p>Map voter emails to legal bank accounts, manage flagged lists, and construct divisions.</p>
        </div>
        <div className="flex-gap-sm">
          <button className="btn btn-primary" onClick={() => setIsAddPersonOpen(true)}>
            Add Person
          </button>
          <button className="btn btn-secondary" onClick={() => setIsAddDivisionOpen(true)}>
            Add Division
          </button>
        </div>
      </header>

      {/* Sub-tab navigation */}
      <div className="flex-gap-sm mb-6" style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
        <button
          className={`btn ${dbSubTab === 'registry' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setDbSubTab('registry')}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <Users size={16} /> Registry Directory
        </button>
        <button
          className={`btn ${dbSubTab === 'bulk' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setDbSubTab('bulk')}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <Upload size={16} /> Bulk Import Hub
        </button>
        <button
          className={`btn ${dbSubTab === 'batch' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setDbSubTab('batch')}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <Save size={16} /> Batch Profile Editor
        </button>
      </div>

      {/* Registry Tab View */}
      {dbSubTab === 'registry' && (
        <div className="grid-3-2">
          <div className="glass-panel">
            <div className="flex-between mb-4">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Linked Accounts Registry</h3>
              <div style={{ position: 'relative', width: '250px' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search accounts..."
                  style={{ paddingLeft: '38px', paddingRight: '12px', height: '40px' }}
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Legal Full Name</th>
                    <th>Email Address</th>
                    <th>Bank Type</th>
                    <th>Bank Account</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((person, idx) => {
                    const isFlagged = flaggedSet.has(person.email.toLowerCase());
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>
                          {person.fullName || (
                            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                              Not Set
                            </span>
                          )}
                        </td>
                        <td>{person.email}</td>
                        <td>
                          {person.bankType ? (
                            <span
                              className={`badge ${
                                person.bankType === 'Telebirr' ? 'badge-telebirr' : 'badge-cbe'
                              }`}
                            >
                              {person.bankType}
                            </span>
                          ) : (
                            <span className="badge badge-unlinked" style={{ backgroundColor: 'rgba(245,158,11,0.06)', color: 'var(--color-warning)', borderColor: 'rgba(245,158,11,0.15)' }}>
                              Missing Bank
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {person.bankAccount || (
                            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                              Not Set
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              className={`icon-btn ${isFlagged ? 'icon-btn-danger' : ''}`}
                              title={isFlagged ? 'Unflag Email' : 'Flag Email'}
                              onClick={() => toggleFlaggedEmail(person.email)}
                              style={isFlagged ? { color: 'var(--color-danger)' } : {}}
                            >
                              <AlertTriangle size={16} />
                            </button>
                            <button
                              className="icon-btn icon-btn-danger"
                              onClick={() => {
                                setPeople((prev) => prev.filter((p) => p.email !== person.email));
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPeople.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                        No registered accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel">
              <div className="glass-panel-title">
                <Users size={18} />
                Project Divisions
              </div>

              {divisions.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  No divisions defined. Click "Add Division" above to create one.
                </p>
              ) : (
                divisions.map((div) => (
                  <div key={div.id} className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
                    <div className="flex-between mb-4">
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{div.name}</h4>
                        <span className="division-count">{div.emails.length} active voters</span>
                      </div>
                      <button
                        className="icon-btn icon-btn-danger"
                        onClick={() => handleRemoveDivision(div.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex-gap-sm mb-4">
                      <input
                        type="email"
                        className="input-field"
                        placeholder="Add email to division..."
                        style={{ height: '36px', fontSize: '0.85rem' }}
                        value={divMemberEmail[div.id] || ''}
                        onChange={(e) =>
                          setDivMemberEmail((prev) => ({ ...prev, [div.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddMemberToDivision(div.id);
                        }}
                      />
                      <button
                        className="btn btn-primary"
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                        onClick={() => handleAddMemberToDivision(div.id)}
                      >
                        Add
                      </button>
                    </div>

                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      {div.emails.map((email) => {
                        const isFlagged = flaggedSet.has(email.toLowerCase());
                        return (
                          <div
                            key={email}
                            className="flex-between"
                            style={{
                              padding: '6px 8px',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                              fontSize: '0.85rem',
                              opacity: isFlagged ? 0.4 : 1,
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isFlagged && <AlertTriangle size={12} color="var(--color-danger)" />}
                              {email}
                            </span>
                            <button
                              className="icon-btn icon-btn-danger"
                              onClick={() => handleRemoveMemberFromDivision(div.id, email)}
                              style={{ padding: '2px' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                      {div.emails.length === 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          Empty division list.
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="glass-panel danger-zone">
              <div className="glass-panel-title" style={{ color: 'var(--color-danger)' }}>
                <AlertTriangle size={18} />
                Flagged Voters List (Omitted Payouts)
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Voters on this blacklist are excluded from generated division lists and defaulted to 'unpaid' during payroll imports.
              </p>

              <div className="flex-gap-sm mb-4">
                <input
                  type="email"
                  className="input-field"
                  placeholder="Add email to flagged list..."
                  style={{ height: '36px' }}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') {
                      toggleFlaggedEmail(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {flaggedEmails.map((email) => (
                  <div
                    key={email}
                    className="flex-between"
                    style={{
                      padding: '6px 8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span>{email}</span>
                    <button
                      className="icon-btn icon-btn-danger"
                      onClick={() => toggleFlaggedEmail(email)}
                      style={{ padding: '2px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {flaggedEmails.length === 0 && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    No flagged emails on file.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Hub View */}
      {dbSubTab === 'bulk' && (
        <div>
          <div className="grid-2">
            <div className="glass-panel">
              <div className="glass-panel-title">
                <Upload size={18} /> Import Options
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Choose your import format to add or batch update database profiles.
              </p>

              <div className="flex-gap-sm mb-4" style={{ display: 'flex', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${bulkImportMode === 'emails' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setBulkImportMode('emails'); setParsedBulkData([]); }}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Email List Paste
                </button>
                <button
                  className={`btn ${bulkImportMode === 'dictionary' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setBulkImportMode('dictionary'); setParsedBulkData([]); }}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Dictionary/JSON Paste
                </button>
                <button
                  className={`btn ${bulkImportMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setBulkImportMode('file'); setParsedBulkData([]); }}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  CSV / Excel Upload
                </button>
              </div>

              {bulkImportMode === 'emails' && (
                <div className="form-group">
                  <label className="form-label">Paste Raw Email Address List</label>
                  <textarea
                    className="textarea-field"
                    placeholder="voter1@gmail.com, voter2@gmail.com, voter3@gmail.com&#10;Or paste text containing emails directly..."
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    style={{ minHeight: '150px' }}
                  />
                  <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={handleParseBulkEmails}>
                    Extract & Parse Emails
                  </button>
                </div>
              )}

              {bulkImportMode === 'dictionary' && (
                <div className="form-group">
                  <label className="form-label">Paste Dictionary block / JSON list</label>
                  <textarea
                    className="textarea-field"
                    placeholder={`Example (lax dictionary or JSON array):\n[\n  {\n    "name": "Abebe Kebede",\n    "email": "abebe@gmail.com",\n    "bankAccount": "1000123456789",\n    "bankType": "CBE"\n  }\n]\n\nOr copy-paste:\n{\n  name: Kebede Alula\n  email: kebede@gmail.com\n  bank account: 1000987654321\n  bank type: CBE\n}`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    style={{ minHeight: '180px' }}
                  />
                  <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={handleParseBulkDictionary}>
                    Parse Dictionary Data
                  </button>
                </div>
              )}

              {bulkImportMode === 'file' && (
                <div className="form-group">
                  <label className="form-label">Upload Spreadsheet File (.csv, .xlsx, .xls)</label>
                  <div
                    style={{
                      border: '2px dashed var(--panel-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '30px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      transition: 'var(--transition)'
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) {
                        const input = document.getElementById('bulk-file-upload') as HTMLInputElement;
                        if (input) {
                          input.files = e.dataTransfer.files;
                          const event = { target: { files: e.dataTransfer.files } } as any;
                          handleBulkFileUpload(event);
                        }
                      }
                    }}
                    onClick={() => document.getElementById('bulk-file-upload')?.click()}
                  >
                    <Upload size={32} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Drag & drop file or click to browse</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Supports Excel spreadsheets or CSV lists</span>
                    <input
                      type="file"
                      id="bulk-file-upload"
                      accept=".csv, .xlsx, .xls"
                      style={{ display: 'none' }}
                      onChange={handleBulkFileUpload}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel">
              <div className="glass-panel-title">
                <FileSpreadsheet size={18} /> Parse Preview
              </div>
              {parsedBulkData.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  Provide list inputs or upload a spreadsheet file to preview.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Ready to import <strong>{parsedBulkData.length} records</strong>:
                    </p>

                    <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedBulkData.map((item, idx) => {
                            const exists = people.some(p => p.email.toLowerCase() === (item.email || '').toLowerCase());
                            return (
                              <tr key={idx}>
                                <td>
                                  {exists ? (
                                    <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '3px 8px' }}>Update</span>
                                  ) : (
                                    <span className="badge badge-telebirr" style={{ fontSize: '0.65rem', padding: '3px 8px' }}>New</span>
                                  )}
                                </td>
                                <td style={{ fontWeight: 600 }}>{item.email}</td>
                                <td>{item.fullName || <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>Empty</span>}</td>
                                <td>
                                  {item.bankAccount ? (
                                    <span style={{ fontSize: '0.75rem' }}>{item.bankType}: {item.bankAccount}</span>
                                  ) : (
                                    <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>No Bank</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex-gap-sm" style={{ marginTop: '20px' }}>
                    <button className="btn btn-success" onClick={handleCommitBulkImport}>
                      <CheckCircle size={16} /> Import into Database
                    </button>
                    <button className="btn btn-secondary" onClick={() => setParsedBulkData([])}>
                      <X size={16} /> Clear Preview
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Profile Editor View */}
      {dbSubTab === 'batch' && (
        <div className="glass-panel">
          <div className="flex-between mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '250px' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search edit list..."
                  style={{ paddingLeft: '38px', paddingRight: '12px', height: '40px' }}
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={batchFilterMissingOnly}
                  onChange={(e) => setBatchFilterMissingOnly(e.target.checked)}
                />
                <span>Only Missing Bank Details</span>
              </label>
            </div>

            <div className="flex-gap-sm">
              {Object.keys(editedPeople).length > 0 && (
                <span style={{ fontSize: '0.85rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                  {Object.keys(editedPeople).length} unsaved rows
                </span>
              )}
              <button
                className={`btn ${Object.keys(editedPeople).length > 0 ? 'btn-success' : 'btn-disabled'}`}
                disabled={Object.keys(editedPeople).length === 0}
                onClick={handleSaveAllChanges}
              >
                <Save size={16} /> Save All Changes
              </button>
              <button
                className={`btn ${Object.keys(editedPeople).length > 0 ? 'btn-secondary' : 'btn-disabled'}`}
                disabled={Object.keys(editedPeople).length === 0}
                onClick={handleDiscardAllChanges}
              >
                <RotateCcw size={16} /> Discard Changes
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Email Address</th>
                  <th>Legal Full Name</th>
                  <th style={{ width: '160px' }}>Bank Type</th>
                  <th style={{ width: '260px' }}>Bank Account</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {people
                  .filter((p) => {
                    const nameMatch = (p.fullName || '').toLowerCase().includes(batchSearch.toLowerCase());
                    const emailMatch = p.email.toLowerCase().includes(batchSearch.toLowerCase());
                    const searchOk = nameMatch || emailMatch;

                    const isMissing = !p.fullName || !p.bankAccount || !p.bankType;
                    const filterOk = !batchFilterMissingOnly || isMissing;

                    return searchOk && filterOk;
                  })
                  .map((person) => {
                    const email = person.email.toLowerCase();
                    const draft = editedPeople[email] || {};

                    const nameVal = draft.fullName !== undefined ? draft.fullName : (person.fullName || '');
                    const typeVal = draft.bankType !== undefined ? draft.bankType : (person.bankType || '');
                    const accountVal = draft.bankAccount !== undefined ? draft.bankAccount : (person.bankAccount || '');

                    const isModified = email in editedPeople;

                    return (
                      <tr key={email} style={isModified ? { backgroundColor: 'rgba(99, 102, 241, 0.03)' } : {}}>
                        <td style={{ fontWeight: 600 }}>{person.email}</td>
                        <td>
                          <input
                            type="text"
                            className="input-field"
                            style={{ height: '36px', padding: '6px 12px', fontSize: '0.85rem' }}
                            placeholder="Enter legal full name..."
                            value={nameVal}
                            onChange={(e) => handleBatchChange(email, 'fullName', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="select-field"
                            style={{ height: '36px', padding: '6px 12px', fontSize: '0.85rem' }}
                            value={typeVal}
                            onChange={(e) => handleBatchChange(email, 'bankType', e.target.value || undefined)}
                          >
                            <option value="">-- Choose Type --</option>
                            <option value="CBE">CBE</option>
                            <option value="Telebirr">Telebirr</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input-field"
                            style={{ height: '36px', padding: '6px 12px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                            placeholder="Enter account number..."
                            value={accountVal}
                            onChange={(e) => handleBatchChange(email, 'bankAccount', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              className={`btn ${isModified ? 'btn-success' : 'btn-disabled'}`}
                              style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '8px' }}
                              disabled={!isModified}
                              onClick={() => handleSaveSingleRow(email)}
                              title="Save row"
                            >
                              <Save size={14} /> Save
                            </button>
                            <button
                              className={`btn ${isModified ? 'btn-secondary' : 'btn-disabled'}`}
                              style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '8px' }}
                              disabled={!isModified}
                              onClick={() => {
                                setEditedPeople((prev) => {
                                  const copy = { ...prev };
                                  delete copy[email];
                                  return copy;
                                });
                              }}
                              title="Undo edits"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {people.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                      No directory members registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
