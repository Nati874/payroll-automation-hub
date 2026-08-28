import React from 'react';

interface ModalsProps {
  // Quick Add Modal state & actions
  quickAddEmail: string | null;
  quickAddName: string;
  quickAddBankNumber: string;
  quickAddBankType: 'CBE' | 'Telebirr';
  setQuickAddName: (val: string) => void;
  setQuickAddBankNumber: (val: string) => void;
  setQuickAddBankType: (val: 'CBE' | 'Telebirr') => void;
  onCloseQuickAdd: () => void;
  onSubmitQuickAdd: (e: React.FormEvent) => void;

  // Add Person Modal state & actions
  isAddPersonOpen: boolean;
  newEmail: string;
  newName: string;
  newBankNumber: string;
  newBankType: 'CBE' | 'Telebirr';
  setNewEmail: (val: string) => void;
  setNewName: (val: string) => void;
  setNewBankNumber: (val: string) => void;
  setNewBankType: (val: 'CBE' | 'Telebirr') => void;
  onCloseAddPerson: () => void;
  onSubmitAddPerson: (e: React.FormEvent) => void;

  // Add Division Modal state & actions
  isAddDivisionOpen: boolean;
  newDivisionName: string;
  setNewDivisionName: (val: string) => void;
  onCloseAddDivision: () => void;
  onSubmitAddDivision: (e: React.FormEvent) => void;
}

export const QuickAddModal: React.FC<Pick<ModalsProps, 
  'quickAddEmail' | 'quickAddName' | 'quickAddBankNumber' | 'quickAddBankType' | 
  'setQuickAddName' | 'setQuickAddBankNumber' | 'setQuickAddBankType' | 
  'onCloseQuickAdd' | 'onSubmitQuickAdd'>> = ({
  quickAddEmail,
  quickAddName,
  quickAddBankNumber,
  quickAddBankType,
  setQuickAddName,
  setQuickAddBankNumber,
  setQuickAddBankType,
  onCloseQuickAdd,
  onSubmitQuickAdd
}) => {
  if (!quickAddEmail) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Link Bank Account</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Add account details for <strong>{quickAddEmail}</strong> to link them inside the database registry.
        </p>

        <form onSubmit={onSubmitQuickAdd}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              className="input-field"
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Bank Type</label>
              <select
                className="select-field"
                value={quickAddBankType}
                onChange={(e: any) => setQuickAddBankType(e.target.value)}
              >
                <option value="CBE">CBE</option>
                <option value="Telebirr">Telebirr</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                required
                className="input-field"
                value={quickAddBankNumber}
                onChange={(e) => setQuickAddBankNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCloseQuickAdd}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save & Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddPersonModal: React.FC<Pick<ModalsProps,
  'isAddPersonOpen' | 'newEmail' | 'newName' | 'newBankNumber' | 'newBankType' |
  'setNewEmail' | 'setNewName' | 'setNewBankNumber' | 'setNewBankType' |
  'onCloseAddPerson' | 'onSubmitAddPerson'>> = ({
  isAddPersonOpen,
  newEmail,
  newName,
  newBankNumber,
  newBankType,
  setNewEmail,
  setNewName,
  setNewBankNumber,
  setNewBankType,
  onCloseAddPerson,
  onSubmitAddPerson
}) => {
  if (!isAddPersonOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Add Person to Database</h3>

        <form onSubmit={onSubmitAddPerson}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              className="input-field"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Legal Full Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Optional name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Bank Type</label>
              <select
                className="select-field"
                value={newBankType}
                onChange={(e: any) => setNewBankType(e.target.value)}
              >
                <option value="CBE">CBE</option>
                <option value="Telebirr">Telebirr</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                className="input-field"
                placeholder="Optional account number..."
                value={newBankNumber}
                onChange={(e) => setNewBankNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCloseAddPerson}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddDivisionModal: React.FC<Pick<ModalsProps,
  'isAddDivisionOpen' | 'newDivisionName' | 'setNewDivisionName' | 
  'onCloseAddDivision' | 'onSubmitAddDivision'>> = ({
  isAddDivisionOpen,
  newDivisionName,
  setNewDivisionName,
  onCloseAddDivision,
  onSubmitAddDivision
}) => {
  if (!isAddDivisionOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Create New Division</h3>

        <form onSubmit={onSubmitAddDivision}>
          <div className="form-group">
            <label className="form-label">Division Name</label>
            <input
              type="text"
              required
              className="input-field"
              value={newDivisionName}
              onChange={(e) => setNewDivisionName(e.target.value)}
              placeholder="e.g. Division A"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCloseAddDivision}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Division
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
