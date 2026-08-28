import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { Person, Division, PayoutRecord, GoogleApiConfig } from './types';
import { parsePayrollText, extractEmails, parseBulkDictionary } from './utils/parser';
import { exportPayrollToExcel } from './utils/excel';
import { requestGoogleAccessToken, exportPayrollToGoogleSheet } from './utils/googleSheets';
import * as XLSX from 'xlsx';
import {
  fetchGoogleSheetData,
  parseSheetPaidRecords,
  runSequentialPayoutRequests,
  type AutomationRecord,
  type AutomationLog
} from './utils/automation';

// Modular Components
import { Sidebar } from './components/Sidebar';
import { PayrollProcessing } from './components/PayrollProcessing';
import { DatabaseManagement } from './components/DatabaseManagement';
import { EmailFormatters } from './components/EmailFormatters';
import { PayoutAutomation } from './components/PayoutAutomation';
import { GlobalSettings } from './components/GlobalSettings';
import { QuickAddModal, AddPersonModal, AddDivisionModal } from './components/Modals';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'payroll' | 'database' | 'emails' | 'automation' | 'settings'>('payroll');

  // Exchange Rate (default 160 ETB/USD)
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem('payroll_exchange_rate');
    return saved ? Number(saved) : 160;
  });

  // Banner notifications
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotif({ type, message });
    setTimeout(() => {
      setNotif(null);
    }, 4500);
  };

  // Flagged list (Blacklist) state
  const [flaggedEmails, setFlaggedEmails] = useState<string[]>(() => {
    const saved = localStorage.getItem('payroll_flagged_emails');
    return saved ? JSON.parse(saved) : [];
  });

  const flaggedSet = useMemo(() => new Set(flaggedEmails.map(e => e.toLowerCase())), [flaggedEmails]);

  // People profiles in DB state
  const [people, setPeople] = useState<Person[]>(() => {
    const saved = localStorage.getItem('payroll_people');
    return saved ? JSON.parse(saved) : [];
  });

  // Divisions state
  const [divisions, setDivisions] = useState<Division[]>(() => {
    const saved = localStorage.getItem('payroll_divisions');
    return saved ? JSON.parse(saved) : [];
  });

  // Google APIs settings config
  const [googleConfig, setGoogleConfig] = useState<GoogleApiConfig>(() => {
    const saved = localStorage.getItem('payroll_google_config');
    return saved ? JSON.parse(saved) : { clientId: '', apiKey: '', spreadsheetId: '' };
  });

  // Payroll process state
  const [rawPayrollText, setRawPayrollText] = useState('');
  const [parsedRecords, setParsedRecords] = useState<PayoutRecord[]>([]);
  const [payoutMode, setPayoutMode] = useState<'all' | 'half' | 'cap'>('all');
  const [payoutCap, setPayoutCap] = useState<number>(500);

  // Quick Add Modal state
  const [quickAddEmail, setQuickAddEmail] = useState<string | null>(null);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddBankNumber, setQuickAddBankNumber] = useState('');
  const [quickAddBankType, setQuickAddBankType] = useState<'CBE' | 'Telebirr'>('CBE');

  // Standard Add Person Modal state
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newBankNumber, setNewBankNumber] = useState('');
  const [newBankType, setNewBankType] = useState<'CBE' | 'Telebirr'>('CBE');

  // Database sub-tab navigation
  const [dbSubTab, setDbSubTab] = useState<'registry' | 'bulk' | 'batch'>('registry');

  // Bulk import states
  const [bulkImportMode, setBulkImportMode] = useState<'emails' | 'dictionary' | 'file'>('emails');
  const [bulkText, setBulkText] = useState('');
  const [parsedBulkData, setParsedBulkData] = useState<Partial<Person>[]>([]);

  // Batch edit states
  const [batchSearch, setBatchSearch] = useState('');
  const [batchFilterMissingOnly, setBatchFilterMissingOnly] = useState(false);
  const [editedPeople, setEditedPeople] = useState<{ [email: string]: Partial<Person> }>({});

  // Standard Add Division Modal state
  const [isAddDivisionOpen, setIsAddDivisionOpen] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState('');

  // Add Member to Division state
  const [divMemberEmail, setDivMemberEmail] = useState<{ [divId: string]: string }>({});

  // Email formatters
  const [rawEmailText, setRawEmailText] = useState('');
  const [selectedDivId, setSelectedDivId] = useState('');

  // Payout Automation configuration states
  const [autoSpreadsheetId, setAutoSpreadsheetId] = useState(() => {
    return localStorage.getItem('payroll_auto_sheet_id') || '';
  });
  const [autoRange, setAutoRange] = useState(() => {
    return localStorage.getItem('payroll_auto_range') || 'Sheet1!A1:E100';
  });
  const [autoTargetUrl, setAutoTargetUrl] = useState(() => {
    return localStorage.getItem('payroll_auto_target_url') || 'https://preferencestudy.com/api/admin/payouts';
  });
  const [autoAuthHeader, setAutoAuthHeader] = useState(() => {
    return localStorage.getItem('payroll_auto_auth_header') || '';
  });
  const [autoDelay, setAutoDelay] = useState<number>(() => {
    const saved = localStorage.getItem('payroll_auto_delay');
    return saved ? parseInt(saved, 10) : 1500;
  });
  const [autoRunMethod, setAutoRunMethod] = useState<'client' | 'backend'>(() => {
    return (localStorage.getItem('payroll_auto_run_method') as 'client' | 'backend') || 'backend';
  });

  // Payout Automation runtime states
  const [autoRecords, setAutoRecords] = useState<AutomationRecord[]>([]);
  const [autoLogs, setAutoLogs] = useState<AutomationLog[]>([]);
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [autoCurrentIdx, setAutoCurrentIdx] = useState(0);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('payroll_exchange_rate', exchangeRate.toString());
  }, [exchangeRate]);

  useEffect(() => {
    localStorage.setItem('payroll_flagged_emails', JSON.stringify(flaggedEmails));
  }, [flaggedEmails]);

  useEffect(() => {
    localStorage.setItem('payroll_people', JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    localStorage.setItem('payroll_divisions', JSON.stringify(divisions));
  }, [divisions]);

  useEffect(() => {
    localStorage.setItem('payroll_google_config', JSON.stringify(googleConfig));
  }, [googleConfig]);

  useEffect(() => {
    localStorage.setItem('payroll_auto_sheet_id', autoSpreadsheetId);
  }, [autoSpreadsheetId]);

  useEffect(() => {
    localStorage.setItem('payroll_auto_range', autoRange);
  }, [autoRange]);

  useEffect(() => {
    localStorage.setItem('payroll_auto_target_url', autoTargetUrl);
  }, [autoTargetUrl]);

  useEffect(() => {
    localStorage.setItem('payroll_auto_auth_header', autoAuthHeader);
  }, [autoAuthHeader]);

  useEffect(() => {
    localStorage.setItem('payroll_auto_delay', autoDelay.toString());
  }, [autoDelay]);

  useEffect(() => {
    localStorage.setItem('payroll_auto_run_method', autoRunMethod);
  }, [autoRunMethod]);

  // Derived filtered directory list
  const [peopleSearch, setPeopleSearch] = useState('');
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      const nameMatch = (p.fullName || '').toLowerCase().includes(peopleSearch.toLowerCase());
      const emailMatch = p.email.toLowerCase().includes(peopleSearch.toLowerCase());
      return nameMatch || emailMatch;
    });
  }, [people, peopleSearch]);

  // Map database details onto incoming payroll list
  const activeRecords = useMemo(() => {
    return parsedRecords.map((item) => {
      const match = people.find((p) => p.email.toLowerCase() === item.email.toLowerCase());
      return {
        ...item,
        fullNameDB: match?.fullName || item.fullNameDB || '',
        bankAccount: match?.bankAccount || item.bankAccount || '',
        bankType: match?.bankType || item.bankType,
      };
    });
  }, [parsedRecords, people]);

  // Financial totals summary calculations
  const totals = useMemo(() => {
    const factor = payoutMode === 'half' ? 0.5 : 1;
    let totalUSD = 0;
    let selectedUSD = 0;
    let selectedETB = 0;
    let unlinkedCount = 0;

    activeRecords.forEach((r) => {
      totalUSD += r.owed;
      if (r.selected) {
        selectedUSD += r.owed * factor;
        selectedETB += (r.owed * factor) * exchangeRate;
        if (!r.bankAccount) {
          unlinkedCount++;
        }
      }
    });

    return { totalUSD, selectedUSD, selectedETB, unlinkedCount };
  }, [activeRecords, payoutMode, exchangeRate]);

  // Apply payout capping rules (greedily pays smaller amounts first)
  useEffect(() => {
    if (payoutMode !== 'cap' || parsedRecords.length === 0) return;

    const sorted = [...parsedRecords].sort((a, b) => a.owed - b.owed);

    const mapped = parsedRecords.map((orig) => {
      const isOmitted = flaggedSet.has(orig.email.toLowerCase());
      if (isOmitted) return { ...orig, selected: false };

      // Find position in sorted list to count cap limits
      const sortIdx = sorted.findIndex((item) => item.email.toLowerCase() === orig.email.toLowerCase());
      const prefixSum = sorted.slice(0, sortIdx + 1).reduce((sum, item) => sum + item.owed, 0);

      return {
        ...orig,
        selected: prefixSum <= payoutCap,
      };
    });

    // Check if there is actual change before setting state to prevent triggers looping
    const hasChanged = mapped.some((item, index) => item.selected !== parsedRecords[index].selected);
    if (hasChanged) {
      setParsedRecords(mapped);
    }
  }, [payoutMode, payoutCap, parsedRecords, flaggedSet]);

  // Handle parsing of pasted logs
  const handleParsePayroll = () => {
    if (!rawPayrollText.trim()) {
      showNotif('error', 'Please paste raw payroll logs first.');
      return;
    }

    try {
      const parsed = parsePayrollText(rawPayrollText);
      if (parsed.length === 0) {
        showNotif('error', 'No valid payroll records parsed. Check formatting.');
        return;
      }

      // Check for blacklist flagged items
      const checked = parsed.map((item) => ({
        ...item,
        selected: !flaggedSet.has(item.email.toLowerCase()),
      }));

      setParsedRecords(checked);
      showNotif('success', `Parsed ${checked.length} records successfully.`);
    } catch (err: any) {
      showNotif('error', `Parsing failed: ${err.message}`);
    }
  };

  const toggleRecordSelect = (index: number) => {
    setParsedRecords((prev) =>
      prev.map((rec, idx) => (idx === index ? { ...rec, selected: !rec.selected } : rec))
    );
  };

  const selectAllVisible = (select: boolean) => {
    setParsedRecords((prev) =>
      prev.map((rec) => {
        if (flaggedSet.has(rec.email.toLowerCase())) {
          return { ...rec, selected: false };
        }
        return { ...rec, selected: select };
      })
    );
  };

  const toggleFlaggedEmail = (email: string) => {
    if (!email.trim() || !email.includes('@')) return;
    const emailLower = email.trim().toLowerCase();

    if (flaggedSet.has(emailLower)) {
      setFlaggedEmails((prev) => prev.filter((e) => e.toLowerCase() !== emailLower));
      showNotif('success', `Unflagged ${emailLower}.`);
    } else {
      setFlaggedEmails((prev) => [...prev, emailLower]);
      showNotif('success', `Flagged ${emailLower}.`);
    }
  };

  // Quick link account details modal actions
  const triggerQuickAdd = (email: string, nameGuess: string) => {
    setQuickAddEmail(email);
    setQuickAddName(nameGuess === 'Unknown' ? '' : nameGuess);
    setQuickAddBankNumber('');
    setQuickAddBankType('CBE');
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddEmail || !quickAddName.trim() || !quickAddBankNumber.trim()) return;

    const added: Person = {
      email: quickAddEmail.toLowerCase(),
      fullName: quickAddName.trim(),
      bankAccount: quickAddBankNumber.trim(),
      bankType: quickAddBankType,
    };

    setPeople((prev) => {
      const exists = prev.some((p) => p.email.toLowerCase() === added.email.toLowerCase());
      if (exists) {
        return prev.map((p) => (p.email.toLowerCase() === added.email.toLowerCase() ? added : p));
      }
      return [...prev, added];
    });

    setQuickAddEmail(null);
    showNotif('success', `Linked account details for ${added.email}`);
  };

  // Modal Person Form Add
  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const added: Person = {
      email: newEmail.trim().toLowerCase(),
      fullName: newName.trim() || undefined,
      bankAccount: newBankNumber.trim() || undefined,
      bankType: newBankNumber.trim() ? newBankType : undefined,
    };

    setPeople((prev) => {
      const exists = prev.some((p) => p.email.toLowerCase() === added.email.toLowerCase());
      if (exists) {
        return prev.map((p) => (p.email.toLowerCase() === added.email.toLowerCase() ? added : p));
      }
      return [...prev, added];
    });

    setNewEmail('');
    setNewName('');
    setNewBankNumber('');
    setNewBankType('CBE');
    setIsAddPersonOpen(false);
    showNotif('success', `Registered profile for ${added.email}`);
  };

  // Modal Division Form Add
  const handleAddDivision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivisionName.trim()) return;

    const added: Division = {
      id: Date.now().toString(),
      name: newDivisionName.trim(),
      emails: [],
    };

    setDivisions((prev) => [...prev, added]);
    setNewDivisionName('');
    setIsAddDivisionOpen(false);
    showNotif('success', `Created division "${added.name}".`);
  };

  const handleRemoveDivision = (id: string) => {
    setDivisions((prev) => prev.filter((d) => d.id !== id));
    showNotif('success', 'Division removed.');
  };

  const handleAddMemberToDivision = (divId: string) => {
    const email = divMemberEmail[divId];
    if (!email || !email.trim().includes('@')) return;

    setDivisions((prev) =>
      prev.map((d) => {
        if (d.id === divId) {
          const exists = d.emails.some((e) => e.toLowerCase() === email.trim().toLowerCase());
          if (exists) return d;
          return { ...d, emails: [...d.emails, email.trim().toLowerCase()] };
        }
        return d;
      })
    );

    setDivMemberEmail((prev) => ({ ...prev, [divId]: '' }));
    showNotif('success', `Added ${email} to division.`);
  };

  const handleRemoveMemberFromDivision = (divId: string, email: string) => {
    setDivisions((prev) =>
      prev.map((d) => {
        if (d.id === divId) {
          return { ...d, emails: d.emails.filter((e) => e.toLowerCase() !== email.toLowerCase()) };
        }
        return d;
      })
    );
    showNotif('success', `Removed ${email} from division.`);
  };

  // Export tables Excel
  const handleExportExcel = () => {
    const selectedRecords = activeRecords.filter((r) => r.selected);
    if (selectedRecords.length === 0) {
      showNotif('error', 'No records selected for payout export.');
      return;
    }

    try {
      const factor = payoutMode === 'half' ? 0.5 : 1;
      const formatted = selectedRecords.map((r) => ({
        ...r,
        owed: r.owed * factor,
      }));

      exportPayrollToExcel(formatted, exchangeRate);
      showNotif('success', 'Excel file downloaded successfully.');
    } catch (err: any) {
      showNotif('error', `Excel export failed: ${err.message}`);
    }
  };

  // Export tables Google Sheets
  const handleExportGoogleSheet = async () => {
    const selectedRecords = activeRecords.filter((r) => r.selected);
    if (selectedRecords.length === 0) {
      showNotif('error', 'No records selected for Google Sheet.');
      return;
    }

    if (!googleConfig.clientId || !googleConfig.apiKey || !googleConfig.spreadsheetId) {
      showNotif('error', 'Please configure your Google API credentials in the Settings tab first.');
      setActiveTab('settings');
      return;
    }

    try {
      showNotif('success', 'Requesting Google authorization... check for pop-up.');
      const accessToken = await requestGoogleAccessToken(googleConfig.clientId);

      showNotif('success', 'Writing to Google Sheet...');
      const factor = payoutMode === 'half' ? 0.5 : 1;
      const formatted = selectedRecords.map((r) => ({
        ...r,
        owed: r.owed * factor,
      }));

      const newTabTitle = await exportPayrollToGoogleSheet(
        googleConfig.spreadsheetId,
        accessToken,
        googleConfig.apiKey,
        formatted,
        exchangeRate
      );

      showNotif('success', `Successfully appended sheet "${newTabTitle}" to your spreadsheet!`);
    } catch (err: any) {
      showNotif('error', `Google Sheet export failed: ${err.message}`);
    }
  };

  // Automation Sheet Fetch
  const handleFetchAutoSheet = async () => {
    if (!autoSpreadsheetId.trim() || !autoRange.trim()) {
      showNotif('error', 'Please enter a valid Google Spreadsheet ID and Range.');
      return;
    }

    if (!googleConfig.clientId || !googleConfig.apiKey) {
      showNotif('error', 'Please configure your Client ID and API Key in Settings first.');
      setActiveTab('settings');
      return;
    }

    setIsFetchingSheet(true);
    setAutoRecords([]);
    setAutoLogs([]);

    try {
      showNotif('success', 'Requesting Google authorization... check for pop-up.');
      const accessToken = await requestGoogleAccessToken(googleConfig.clientId);

      showNotif('success', 'Reading cells from Google Sheet...');
      const rows = await fetchGoogleSheetData(
        autoSpreadsheetId,
        autoRange,
        accessToken,
        googleConfig.apiKey
      );

      const parsed = parseSheetPaidRecords(rows);
      setAutoRecords(parsed);

      showNotif('success', `Found ${parsed.length} paid records in sheet.`);
    } catch (err: any) {
      showNotif('error', `Failed to load sheet data: ${err.message}`);
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // Run the Client-Side sequential dispatch automation
  const handleRunClientAutomation = async () => {
    try {
      await runSequentialPayoutRequests(
        autoRecords,
        autoTargetUrl,
        autoAuthHeader,
        autoDelay,
        (log) => setAutoLogs((prev) => [log, ...prev]),
        (idx) => setAutoCurrentIdx(idx)
      );
      showNotif('success', 'Payout automation runner complete!');
    } catch (err: any) {
      showNotif('error', `Automation run error: ${err.message}`);
    } finally {
      setIsRunningAutomation(false);
    }
  };

  // Run the local Node.js backend sequential dispatch automation
  const handleRunBackendAutomation = async () => {
    const logMsg = (log: AutomationLog) => setAutoLogs((prev) => [log, ...prev]);

    logMsg({
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Contacting local backend proxy at http://localhost:3001/api/run-automation...',
    });

    try {
      const response = await fetch('http://localhost:3001/api/run-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: autoRecords,
          delayMs: autoDelay,
          targetUrl: autoTargetUrl,
          authHeader: autoAuthHeader,
        }),
      });

      if (!response.body) {
        throw new Error('Local backend did not return a readable stream.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let successCount = 0;
      let failureCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsedLog = JSON.parse(line) as AutomationLog;
            logMsg(parsedLog);

            // Update progress index dynamically
            if (parsedLog.message.includes('[Success]')) {
              successCount++;
              setAutoCurrentIdx((prev) => prev + 1);
            } else if (parsedLog.message.includes('[Failed]') || parsedLog.message.includes('[Error]')) {
              failureCount++;
              setAutoCurrentIdx((prev) => prev + 1);
            }
          } catch (e) {
            logMsg({
              timestamp: new Date().toLocaleTimeString(),
              type: 'info',
              message: line,
            });
          }
        }
      }

      showNotif('success', `Backend run complete. Success: ${successCount}, Failures: ${failureCount}`);
    } catch (err: any) {
      logMsg({
        timestamp: new Date().toLocaleTimeString(),
        type: 'error',
        message: `Local Backend connection failed: ${err.message}. Make sure the Node server is running on http://localhost:3001.`,
      });
      showNotif('error', `Backend execution failed: ${err.message}`);
    } finally {
      setIsRunningAutomation(false);
    }
  };

  const handleRunAutomation = () => {
    if (autoRecords.length === 0) {
      showNotif('error', 'No paid records to process. Please fetch sheet data first.');
      return;
    }
    if (!autoTargetUrl.trim()) {
      showNotif('error', 'Please specify a target endpoint URL.');
      return;
    }

    setIsRunningAutomation(true);
    setAutoLogs([]);
    setAutoCurrentIdx(0);

    if (autoRunMethod === 'backend') {
      handleRunBackendAutomation();
    } else {
      handleRunClientAutomation();
    }
  };

  // Chat conversation email extractor trigger
  const handleExtractEmails = () => {
    if (!rawEmailText.trim()) {
      showNotif('error', 'Paste raw text to extract emails.');
      return;
    }

    const found = extractEmails(rawEmailText);
    if (found.length === 0) {
      showNotif('error', 'No emails found in the text.');
      return;
    }

    setRawEmailText(found.join(', '));
    showNotif('success', `Extracted and formatted ${found.length} unique emails.`);
  };

  const getDivisionEmailsFormatted = (divId: string) => {
    const div = divisions.find((d) => d.id === divId);
    if (!div) return '';
    const activeEmails = div.emails.filter((e) => !flaggedSet.has(e.toLowerCase()));
    return activeEmails.join(', ');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotif('success', 'Copied list to clipboard!');
  };

  // Backup data
  const exportBackupJSON = () => {
    const backup = {
      people,
      divisions,
      flaggedEmails,
      exchangeRate,
      googleConfig,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `payroll_hub_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotif('success', 'Backup file downloaded.');
  };

  const importBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (!e.target.files || e.target.files.length === 0) return;

    fileReader.readAsText(e.target.files[0], 'UTF-8');
    fileReader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.people) setPeople(data.people);
        if (data.divisions) setDivisions(data.divisions);
        if (data.flaggedEmails) setFlaggedEmails(data.flaggedEmails);
        if (data.exchangeRate) setExchangeRate(data.exchangeRate);
        if (data.googleConfig) setGoogleConfig(data.googleConfig);

        showNotif('success', 'Backup imported successfully.');
      } catch (err) {
        showNotif('error', 'Failed to parse backup JSON file.');
      }
    };
  };

  // Bulk Import Hub Triggers
  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    fileReader.readAsArrayBuffer(file);
    fileReader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        if (rows.length === 0) {
          showNotif('error', 'Uploaded spreadsheet is empty.');
          return;
        }

        // Lax Column headers lookup
        const headers = (rows[0] as string[]).map((h) => String(h).trim().toLowerCase());
        const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('addr'));
        const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('person') || h.includes('user'));
        const accIdx = headers.findIndex((h) => h.includes('acc') || h.includes('bank') || h.includes('number'));
        const typeIdx = headers.findIndex((h) => h.includes('type') || h.includes('banktype') || h.includes('provider'));

        const finalEmailIdx = emailIdx !== -1 ? emailIdx : 0;
        const finalNameIdx = nameIdx !== -1 ? nameIdx : 1;
        const finalAccIdx = accIdx !== -1 ? accIdx : 2;
        const finalTypeIdx = typeIdx !== -1 ? typeIdx : 3;

        const imported: Partial<Person>[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] as any[];
          if (!r || r.length === 0) continue;

          const email = r[finalEmailIdx] ? String(r[finalEmailIdx]).trim() : '';
          const name = r[finalNameIdx] ? String(r[finalNameIdx]).trim() : '';
          const account = r[finalAccIdx] ? String(r[finalAccIdx]).trim() : '';
          let bType = r[finalTypeIdx] ? String(r[finalTypeIdx]).trim() : '';

          if (email && email.includes('@')) {
            // Normalise bank types
            let normalizedBank: 'CBE' | 'Telebirr' | undefined = undefined;
            if (bType.toLowerCase().includes('tele') || bType.toLowerCase().includes('birr')) {
              normalizedBank = 'Telebirr';
            } else if (bType.toLowerCase().includes('cbe') || bType.toLowerCase().includes('commercial')) {
              normalizedBank = 'CBE';
            } else if (account) {
              normalizedBank = 'CBE'; // fallback default
            }

            imported.push({
              email: email.toLowerCase(),
              fullName: name || undefined,
              bankAccount: account || undefined,
              bankType: normalizedBank,
            });
          }
        }

        setParsedBulkData(imported);
        showNotif('success', `Parsed ${imported.length} database profiles from spreadsheet.`);
      } catch (err: any) {
        showNotif('error', `Failed to parse spreadsheet file: ${err.message}`);
      }
    };
  };

  const handleParseBulkEmails = () => {
    if (!bulkText.trim()) {
      showNotif('error', 'Paste raw email list first.');
      return;
    }
    const emails = extractEmails(bulkText);
    if (emails.length === 0) {
      showNotif('error', 'No valid email addresses found.');
      return;
    }

    const imported = emails.map((email) => ({
      email: email.toLowerCase(),
    }));

    setParsedBulkData(imported);
    showNotif('success', `Parsed ${imported.length} unique emails. Preview ready.`);
  };

  const handleParseBulkDictionary = () => {
    if (!bulkText.trim()) {
      showNotif('error', 'Paste JSON list or dictionary block first.');
      return;
    }

    try {
      const parsed = parseBulkDictionary(bulkText);
      if (parsed.length === 0) {
        showNotif('error', 'Could not parse any profiles. Check formatting.');
        return;
      }
      setParsedBulkData(parsed);
      showNotif('success', `Parsed ${parsed.length} profiles from paste logs. Preview ready.`);
    } catch (err: any) {
      showNotif('error', `Failed to parse dictionary block: ${err.message}`);
    }
  };

  const handleCommitBulkImport = () => {
    if (parsedBulkData.length === 0) return;

    setPeople((prev) => {
      const copy = [...prev];
      parsedBulkData.forEach((imported) => {
        if (!imported.email) return;
        const existsIdx = copy.findIndex((p) => p.email.toLowerCase() === imported.email!.toLowerCase());

        if (existsIdx !== -1) {
          // Merge incoming properties
          copy[existsIdx] = {
            ...copy[existsIdx],
            fullName: imported.fullName || copy[existsIdx].fullName,
            bankAccount: imported.bankAccount || copy[existsIdx].bankAccount,
            bankType: imported.bankType || copy[existsIdx].bankType,
          };
        } else {
          copy.push({
            email: imported.email.toLowerCase(),
            fullName: imported.fullName,
            bankAccount: imported.bankAccount,
            bankType: imported.bankType,
          });
        }
      });
      return copy;
    });

    showNotif('success', `Successfully integrated ${parsedBulkData.length} records into the database.`);
    setParsedBulkData([]);
    setBulkText('');
    setDbSubTab('registry');
  };

  // Batch Editor state handlers
  const handleBatchChange = (email: string, field: keyof Person, value: any) => {
    setEditedPeople((prev) => {
      const rowDraft = prev[email] || {};
      return {
        ...prev,
        [email]: {
          ...rowDraft,
          [field]: value,
        },
      };
    });
  };

  const handleSaveSingleRow = (email: string) => {
    const draft = editedPeople[email];
    if (!draft) return;

    setPeople((prev) =>
      prev.map((p) => {
        if (p.email.toLowerCase() === email.toLowerCase()) {
          return {
            ...p,
            ...draft,
          };
        }
        return p;
      })
    );

    setEditedPeople((prev) => {
      const copy = { ...prev };
      delete copy[email];
      return copy;
    });

    showNotif('success', `Saved edits for ${email}`);
  };

  const handleSaveAllChanges = () => {
    const emailsToUpdate = Object.keys(editedPeople);
    if (emailsToUpdate.length === 0) return;

    setPeople((prev) =>
      prev.map((p) => {
        const draft = editedPeople[p.email.toLowerCase()];
        if (draft) {
          return {
            ...p,
            ...draft,
          };
        }
        return p;
      })
    );

    setEditedPeople({});
    showNotif('success', `Saved all unsaved changes for ${emailsToUpdate.length} records.`);
  };

  const handleDiscardAllChanges = () => {
    setEditedPeople({});
    showNotif('success', 'Discarded all unsaved changes.');
  };

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} exchangeRate={exchangeRate} />

      {/* Main dashboard content area */}
      <main className="main-content">
        {/* Banner Alert notifications */}
        {notif && (
          <div className={notif.type === 'success' ? 'success-banner' : 'warning-banner'}>
            {notif.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{notif.message}</span>
          </div>
        )}

        {/* Router View Switches */}
        {activeTab === 'payroll' && (
          <PayrollProcessing
            rawPayrollText={rawPayrollText}
            setRawPayrollText={setRawPayrollText}
            handleParsePayroll={handleParsePayroll}
            parsedRecords={parsedRecords}
            setParsedRecords={setParsedRecords}
            activeRecords={activeRecords}
            payoutMode={payoutMode}
            setPayoutMode={setPayoutMode}
            payoutCap={payoutCap}
            setPayoutCap={setPayoutCap}
            toggleRecordSelect={toggleRecordSelect}
            selectAllVisible={selectAllVisible}
            totals={totals}
            exchangeRate={exchangeRate}
            flaggedSet={flaggedSet}
            triggerQuickAdd={triggerQuickAdd}
            handleExportExcel={handleExportExcel}
            handleExportGoogleSheet={handleExportGoogleSheet}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseManagement
            dbSubTab={dbSubTab}
            setDbSubTab={setDbSubTab}
            setIsAddPersonOpen={setIsAddPersonOpen}
            setIsAddDivisionOpen={setIsAddDivisionOpen}
            people={people}
            setPeople={setPeople}
            filteredPeople={filteredPeople}
            peopleSearch={peopleSearch}
            setPeopleSearch={setPeopleSearch}
            flaggedEmails={flaggedEmails}
            flaggedSet={flaggedSet}
            toggleFlaggedEmail={toggleFlaggedEmail}
            divisions={divisions}
            handleRemoveDivision={handleRemoveDivision}
            divMemberEmail={divMemberEmail}
            setDivMemberEmail={setDivMemberEmail}
            handleAddMemberToDivision={handleAddMemberToDivision}
            handleRemoveMemberFromDivision={handleRemoveMemberFromDivision}
            bulkImportMode={bulkImportMode}
            setBulkImportMode={setBulkImportMode}
            bulkText={bulkText}
            setBulkText={setBulkText}
            parsedBulkData={parsedBulkData}
            setParsedBulkData={setParsedBulkData}
            handleBulkFileUpload={handleBulkFileUpload}
            handleParseBulkEmails={handleParseBulkEmails}
            handleParseBulkDictionary={handleParseBulkDictionary}
            handleCommitBulkImport={handleCommitBulkImport}
            batchSearch={batchSearch}
            setBatchSearch={setBatchSearch}
            batchFilterMissingOnly={batchFilterMissingOnly}
            setBatchFilterMissingOnly={setBatchFilterMissingOnly}
            editedPeople={editedPeople}
            setEditedPeople={setEditedPeople}
            handleBatchChange={handleBatchChange}
            handleSaveSingleRow={handleSaveSingleRow}
            handleSaveAllChanges={handleSaveAllChanges}
            handleDiscardAllChanges={handleDiscardAllChanges}
          />
        )}

        {activeTab === 'emails' && (
          <EmailFormatters
            rawEmailText={rawEmailText}
            setRawEmailText={setRawEmailText}
            handleExtractEmails={handleExtractEmails}
            divisions={divisions}
            selectedDivId={selectedDivId}
            setSelectedDivId={setSelectedDivId}
            getDivisionEmailsFormatted={getDivisionEmailsFormatted}
            copyToClipboard={copyToClipboard}
          />
        )}

        {activeTab === 'automation' && (
          <PayoutAutomation
            autoSpreadsheetId={autoSpreadsheetId}
            setAutoSpreadsheetId={setAutoSpreadsheetId}
            autoRange={autoRange}
            setAutoRange={setAutoRange}
            autoTargetUrl={autoTargetUrl}
            setAutoTargetUrl={setAutoTargetUrl}
            autoAuthHeader={autoAuthHeader}
            setAutoAuthHeader={setAutoAuthHeader}
            autoDelay={autoDelay}
            setAutoDelay={setAutoDelay}
            autoRunMethod={autoRunMethod}
            setAutoRunMethod={setAutoRunMethod}
            autoRecords={autoRecords}
            autoLogs={autoLogs}
            isFetchingSheet={isFetchingSheet}
            isRunningAutomation={isRunningAutomation}
            autoCurrentIdx={autoCurrentIdx}
            handleFetchAutoSheet={handleFetchAutoSheet}
            handleRunAutomation={handleRunAutomation}
          />
        )}

        {activeTab === 'settings' && (
          <GlobalSettings
            exchangeRate={exchangeRate}
            setExchangeRate={setExchangeRate}
            exportBackupJSON={exportBackupJSON}
            importBackupJSON={importBackupJSON}
            googleConfig={googleConfig}
            setGoogleConfig={setGoogleConfig}
          />
        )}
      </main>

      {/* Popups & Modals */}
      <QuickAddModal
        quickAddEmail={quickAddEmail}
        quickAddName={quickAddName}
        quickAddBankNumber={quickAddBankNumber}
        quickAddBankType={quickAddBankType}
        setQuickAddName={setQuickAddName}
        setQuickAddBankNumber={setQuickAddBankNumber}
        setQuickAddBankType={setQuickAddBankType}
        onCloseQuickAdd={() => setQuickAddEmail(null)}
        onSubmitQuickAdd={handleQuickAddSubmit}
      />

      <AddPersonModal
        isAddPersonOpen={isAddPersonOpen}
        newEmail={newEmail}
        newName={newName}
        newBankNumber={newBankNumber}
        newBankType={newBankType}
        setNewEmail={setNewEmail}
        setNewName={setNewName}
        setNewBankNumber={setNewBankNumber}
        setNewBankType={setNewBankType}
        onCloseAddPerson={() => setIsAddPersonOpen(false)}
        onSubmitAddPerson={handleAddPerson}
      />

      <AddDivisionModal
        isAddDivisionOpen={isAddDivisionOpen}
        newDivisionName={newDivisionName}
        setNewDivisionName={setNewDivisionName}
        onCloseAddDivision={() => setIsAddDivisionOpen(false)}
        onSubmitAddDivision={handleAddDivision}
      />
    </div>
  );
}
