import type { PayoutRecord, Person } from '../types';

/**
 * Parses money strings (e.g. "$1,293.15" or "0" or "-$10") into a numeric float.
 */
export function parseMoneyValue(str: string): number {
  if (!str) return 0;
  // Remove currency symbols, commas, and other non-numeric chars except minus and decimal point
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Parses raw text copied from the preferencestudy.com admin payment section.
 * Using labels (Earned, Paid, Flagged, Owed) to correctly assign the values.
 */
export function parsePayrollText(text: string): Omit<PayoutRecord, 'selected'>[] {
  // Split by lines, trim, and filter out empty lines
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const records: Omit<PayoutRecord, 'selected'>[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (emailRegex.test(lines[i])) {
      const email = lines[i];
      
      // Name is generally the line preceding the email
      let name = 'Unknown';
      if (i > 0) {
        const prevLine = lines[i - 1];
        // Check if the previous line is not a number or a system command
        if (!emailRegex.test(prevLine) && !prevLine.includes('$') && isNaN(Number(prevLine))) {
          name = prevLine;
        }
      }

      // Default values
      let earned = 0;
      let paid = 0;
      let flagged = 0;
      let owed = 0;

      // Scan up to 18 lines forward to find labels and assign their corresponding numeric values
      const scanEnd = Math.min(lines.length, i + 18);
      for (let j = i + 1; j < scanEnd; j++) {
        const line = lines[j].toLowerCase();
        if (line === 'earned') {
          earned = parseMoneyValue(lines[j - 1]);
        } else if (line === 'paid') {
          paid = parseMoneyValue(lines[j - 1]);
        } else if (line === 'flagged') {
          flagged = parseMoneyValue(lines[j - 1]);
        } else if (line === 'owed') {
          owed = parseMoneyValue(lines[j - 1]);
        }
      }

      records.push({
        name,
        email,
        earned,
        paid,
        flagged,
        owed,
      });
    }
  }

  return records;
}

/**
 * Extracts all unique emails from a raw block of text.
 */
export function extractEmails(text: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = text.match(emailRegex) || [];
  // Return unique emails
  return Array.from(new Set(matches.map((e) => e.toLowerCase())));
}

/**
 * Parses raw text containing key-value dictionary formats or raw JSON lists of people.
 */
export function parseBulkDictionary(text: string): Partial<Person>[] {
  // First, check if it's a JSON array or object
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      let parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }
      return parsed.map((item: any) => ({
        email: (item.email || item.emailAddress || '').trim().toLowerCase(),
        fullName: (item.name || item.fullName || item.fullNameDB || '').trim() || undefined,
        bankAccount: item.bankAccount || item.bankAccountNumber || item.account ? String(item.bankAccount || item.bankAccountNumber || item.account).trim() : undefined,
        bankType: normalizeBankType(item.bankType || item.type || item.bank),
      })).filter((p: any) => p.email);
    }
  } catch (e) {
    // Ignore JSON error and fallback to custom lax dictionary parser
  }

  // Lax parsing: split by curly braces first, or by double newlines if no curly braces
  let blocks: string[] = [];
  if (text.includes('{')) {
    const braceRegex = /\{([^}]+)\}/g;
    let match;
    while ((match = braceRegex.exec(text)) !== null) {
      blocks.push(match[1]);
    }
  }
  
  if (blocks.length === 0) {
    // Split by double newline or multiple newlines
    blocks = text.split(/\n\s*\n+/);
  }

  const results: Partial<Person>[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const item: Partial<Person> = {};
    
    for (const line of lines) {
      let key = '';
      let val = '';
      
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        key = line.substring(0, colonIdx).trim().toLowerCase();
        val = line.substring(colonIdx + 1).trim();
      } else {
        const spaceIdx = line.indexOf(' ');
        if (spaceIdx !== -1) {
          const firstWord = line.substring(0, spaceIdx).trim().toLowerCase();
          if (['name', 'email', 'bank', 'account', 'type'].includes(firstWord)) {
            key = firstWord;
            val = line.substring(spaceIdx + 1).trim();
          }
        }
      }

      if (!key) continue;

      // Clean key name for easier matching
      const keyClean = key.replace(/[^a-z]/g, '');
      
      if (keyClean === 'email' || keyClean === 'emailaddress') {
        item.email = val.toLowerCase();
      } else if (keyClean === 'name' || keyClean === 'fullname' || keyClean === 'legalname') {
        item.fullName = val || undefined;
      } else if (keyClean === 'bankaccount' || keyClean === 'account' || keyClean === 'accountnumber') {
        item.bankAccount = val || undefined;
      } else if (keyClean === 'banktype' || keyClean === 'type' || keyClean === 'bank') {
        item.bankType = normalizeBankType(val);
      }
    }

    if (item.email) {
      results.push(item);
    }
  }

  return results;
}

function normalizeBankType(val: any): 'CBE' | 'Telebirr' | undefined {
  if (!val) return undefined;
  const lower = val.toString().toLowerCase();
  if (lower.includes('tele') || lower.includes('birr')) {
    return 'Telebirr';
  }
  if (lower.includes('cbe') || lower.includes('commercial')) {
    return 'CBE';
  }
  return undefined;
}

/**
 * Command interpreter that parses natural language instructions for irregular payment distributions
 * and applies them onto the active payout records list.
 */
export function parseSmartPayoutCommand(
  command: string,
  records: PayoutRecord[],
  exchangeRate: number,
  mustIncludeEmails: string = ''
): { records: PayoutRecord[]; log: string } {
  const normalized = command.trim().toLowerCase();
  
  if (!normalized) {
    return { records, log: 'No command entered.' };
  }

  // Create a deep copy of records to prevent mutation issues
  let updatedRecords = records.map((r) => ({ ...r }));

  // 1. Parse Must-Include Emails set
  const forcedSet = new Set(
    mustIncludeEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)
  );

  // 2. Parse individual threshold caps (e.g., "if owed $100+ pay them 100")
  let capThreshold: number | null = null;
  let capLimit: number | null = null;

  // Regex pattern matches: "owed $100+ ... pay 100", "owed > 100 ... limit to 100", etc.
  const capMatch = normalized.match(/owed\s*\$?([\d,]+)\+?\s*(?:[a-zA-Z\s]+)?pay\s*(?:them\s*)?\$?([\d,]+)/i);
  if (capMatch) {
    capThreshold = parseFloat(capMatch[1].replace(/,/g, ''));
    capLimit = parseFloat(capMatch[2].replace(/,/g, ''));
  }

  // Helper function to apply threshold caps to any calculated payout
  const getCappedPayout = (originalOwed: number, proposedPayout: number) => {
    let amt = proposedPayout;
    if (capThreshold !== null && capLimit !== null && originalOwed >= capThreshold) {
      amt = Math.min(amt, capLimit);
    }
    return Math.max(0, Math.min(amt, originalOwed));
  };

  // 3. Determine Sorting Strategy
  let sortStrategy = 'rotation'; // default: rotational queue
  if (normalized.includes('smallest') || normalized.includes('lowest') || normalized.includes('least')) {
    sortStrategy = 'smallest_owed';
  } else if (normalized.includes('largest') || normalized.includes('highest') || normalized.includes('most') || normalized.includes('biggest')) {
    sortStrategy = 'largest_owed';
  }

  // Filter candidates with active owed balances
  let candidates = updatedRecords.filter((r) => r.owed > 0);
  if (candidates.length === 0) {
    return { records, log: 'Error: No eligible people with an active owed balance were found.' };
  }

  // Partition candidates: Must-Include goes first
  const forcedCandidates = candidates.filter((c) => forcedSet.has(c.email.toLowerCase()));
  const otherCandidates = candidates.filter((c) => !forcedSet.has(c.email.toLowerCase()));

  // Sort otherCandidates
  if (sortStrategy === 'smallest_owed') {
    otherCandidates.sort((a, b) => a.owed - b.owed);
  } else if (sortStrategy === 'largest_owed') {
    otherCandidates.sort((a, b) => b.owed - a.owed);
  } else {
    // Keep chronological rotation queue (which is pre-sorted in activeRecords)
    const orderMap = new Map(updatedRecords.map((r, idx) => [r.email.toLowerCase(), idx]));
    otherCandidates.sort((a, b) => (orderMap.get(a.email.toLowerCase()) ?? 0) - (orderMap.get(b.email.toLowerCase()) ?? 0));
  }

  // Merge so that Must-Include candidates are always processed first
  const queue = [...forcedCandidates, ...otherCandidates];

  // 4. Extract Budget Cap (e.g. 5000, 3000)
  let budgetCap: number | null = null;
  const budgetRegexes = [
    /(?:until it reaches|up to|budget of|limit of|total of|cap of)\s+\$?([\d,]+(?:\.\d+)?)/i,
    /(?:split|distribute)\s+\$?([\d,]+(?:\.\d+)?)/i,
    /([1-9]\d{2,})\s*(?:dollars|usd)/i
  ];

  for (const regex of budgetRegexes) {
    const match = normalized.match(regex);
    if (match) {
      budgetCap = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  if (budgetCap === null) {
    const endNumberMatch = normalized.match(/\b([1-9]\d{1,})\b\s*$/);
    if (endNumberMatch) {
      budgetCap = parseFloat(endNumberMatch[1]);
    }
  }

  // 5. Determine Payout Distribution Style
  let distStyle = 'full'; 
  let fixedAmount: number | null = null;

  if (normalized.includes('split') || normalized.includes('divide') || normalized.includes('evenly')) {
    distStyle = 'split';
  } else if (normalized.includes('proportional')) {
    distStyle = 'proportional';
  } else {
    const eachRegex = /(?:pay|each|everyone)\s+\$?([\d,]+(?:\.\d+)?)(?:\s+each)?/i;
    const eachMatch = normalized.match(eachRegex);
    if (eachMatch) {
      fixedAmount = parseFloat(eachMatch[1].replace(/,/g, ''));
      if (!isNaN(fixedAmount)) {
        distStyle = 'fixed';
      }
    }
  }

  const sortLog = sortStrategy === 'smallest_owed' 
    ? 'sorted by smallest owed' 
    : sortStrategy === 'largest_owed' 
    ? 'sorted by largest owed' 
    : 'sorted by rotational queue';

  const selectedEmails = new Map<string, number>();

  // 6. Execute Selected Payout Allocation Logic
  if (distStyle === 'split') {
    if (budgetCap === null || budgetCap <= 0) {
      return { records, log: 'Error: Please specify a budget amount to split (e.g. "split $5000").' };
    }

    const peopleMatch = normalized.match(/among\s+(\d+)\s+people/i);
    const limitPeople = peopleMatch ? parseInt(peopleMatch[1], 10) : queue.length;
    const countToPay = Math.min(limitPeople, queue.length);

    if (countToPay === 0) {
      return { records, log: 'Error: No eligible candidates found.' };
    }

    const splitVal = Number((budgetCap / countToPay).toFixed(2));
    const targets = queue.slice(0, countToPay);
    
    for (const t of targets) {
      selectedEmails.set(t.email.toLowerCase(), getCappedPayout(t.owed, splitVal));
    }
  } else if (distStyle === 'proportional') {
    if (budgetCap === null || budgetCap <= 0) {
      return { records, log: 'Error: Please specify a budget amount to distribute (e.g. "distribute $5000 proportional").' };
    }

    const totalOwed = queue.reduce((sum, r) => sum + r.owed, 0);
    for (const c of queue) {
      const prop = c.owed / totalOwed;
      const amount = getCappedPayout(c.owed, prop * budgetCap);
      if (amount > 0) {
        selectedEmails.set(c.email.toLowerCase(), amount);
      }
    }
  } else if (distStyle === 'fixed') {
    const amt = fixedAmount ?? 0;
    let currentSum = 0;
    
    const peopleMatch = normalized.match(/(\d+)\s+people/i);
    const limitPeople = peopleMatch ? parseInt(peopleMatch[1], 10) : queue.length;

    for (const c of queue) {
      if (selectedEmails.size >= limitPeople) break;
      
      const payout = getCappedPayout(c.owed, amt);
      if (budgetCap !== null && currentSum + payout > budgetCap) {
        const remainder = getCappedPayout(c.owed, budgetCap - currentSum);
        if (remainder > 0) {
          selectedEmails.set(c.email.toLowerCase(), Number(remainder.toFixed(2)));
          currentSum += remainder;
        }
        break;
      }
      selectedEmails.set(c.email.toLowerCase(), payout);
      currentSum += payout;
    }
  } else {
    // Greedy Full accumulation (default style)
    let currentSum = 0;
    
    for (const c of queue) {
      const payout = getCappedPayout(c.owed, c.owed);
      
      if (budgetCap !== null) {
        if (currentSum >= budgetCap) {
          break;
        }
        if (currentSum + payout > budgetCap) {
          const remainder = getCappedPayout(c.owed, budgetCap - currentSum);
          if (remainder > 0) {
            selectedEmails.set(c.email.toLowerCase(), Number(remainder.toFixed(2)));
            currentSum += remainder;
          }
          break;
        }
      }
      
      selectedEmails.set(c.email.toLowerCase(), payout);
      currentSum += payout;
    }
  }

  // 7. Update and return records based on selected Map
  updatedRecords = updatedRecords.map((r) => {
    const emailKey = r.email.toLowerCase();
    if (selectedEmails.has(emailKey)) {
      const paidVal = selectedEmails.get(emailKey) ?? 0;
      return {
        ...r,
        selected: true,
        owed: paidVal,
        owedETB: Number((paidVal * exchangeRate).toFixed(2)),
      };
    }
    return {
      ...r,
      selected: false,
    };
  });

  const finalSum = updatedRecords.filter((r) => r.selected).reduce((sum, r) => sum + r.owed, 0);
  const selectedCount = updatedRecords.filter((r) => r.selected).length;

  let styleDesc = '';
  if (distStyle === 'split') styleDesc = 'split budget evenly';
  else if (distStyle === 'proportional') styleDesc = 'proportional split';
  else if (distStyle === 'fixed') styleDesc = `fixed payout of $${fixedAmount?.toFixed(2)} each`;
  else styleDesc = 'full balance payouts';

  let includeLog = forcedSet.size > 0 ? ` forced ${forcedSet.size} emails first,` : '';
  let capLog = (capThreshold !== null && capLimit !== null) ? ` individual cap of $${capLimit} for balances >= $${capThreshold} applied,` : '';

  return {
    records: updatedRecords,
    log: `Instruction applied:${includeLog}${capLog} allocated funds using ${styleDesc} (${sortLog}). Selected ${selectedCount} people, total calculation: $${finalSum.toFixed(2)}.`,
  };
}
