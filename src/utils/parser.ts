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
  exchangeRate: number
): { records: PayoutRecord[]; log: string } {
  const normalized = command.trim().toLowerCase();
  
  if (!normalized) {
    return { records, log: 'No command entered.' };
  }

  // Create a deep copy of records to prevent mutation issues
  let updatedRecords = records.map((r) => ({ ...r }));

  // 1. Determine Sorting Strategy
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

  // Apply sorting strategy on candidates
  if (sortStrategy === 'smallest_owed') {
    candidates.sort((a, b) => a.owed - b.owed);
  } else if (sortStrategy === 'largest_owed') {
    candidates.sort((a, b) => b.owed - a.owed);
  } else {
    // Keep chronological rotation queue (which is pre-sorted in activeRecords)
    // To ensure consistency, we preserve their exact index placement in the activeRecords list
    const orderMap = new Map(updatedRecords.map((r, idx) => [r.email.toLowerCase(), idx]));
    candidates.sort((a, b) => (orderMap.get(a.email.toLowerCase()) ?? 0) - (orderMap.get(b.email.toLowerCase()) ?? 0));
  }

  // 2. Extract Budget Cap (e.g. 5000, 3000)
  // Look for: "reaches 5000", "up to 5000", "budget of 5000", "limit of 5000", "total of 5000", or "split 5000", "distribute 5000"
  let budgetCap: number | null = null;
  const budgetRegexes = [
    /(?:until it reaches|up to|budget of|limit of|total of|cap of)\s+\$?([\d,]+(?:\.\d+)?)/i,
    /(?:split|distribute)\s+\$?([\d,]+(?:\.\d+)?)/i,
    /([1-9]\d{2,})\s*(?:dollars|usd)/i // e.g. "5000 dollars"
  ];

  for (const regex of budgetRegexes) {
    const match = normalized.match(regex);
    if (match) {
      budgetCap = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // If no budget matched but we see a trailing number like "reaches 5000" or just a number at the end:
  if (budgetCap === null) {
    const endNumberMatch = normalized.match(/\b([1-9]\d{1,})\b\s*$/);
    if (endNumberMatch) {
      budgetCap = parseFloat(endNumberMatch[1]);
    }
  }

  // 3. Determine Payout Distribution Style
  let distStyle = 'full'; // default style: full owed balance accumulation
  let fixedAmount: number | null = null;

  if (normalized.includes('split') || normalized.includes('divide') || normalized.includes('evenly')) {
    distStyle = 'split';
  } else if (normalized.includes('proportional')) {
    distStyle = 'proportional';
  } else {
    // Check for fixed payment instruction: e.g. "pay $100 each", "pay everyone $100", "$100 each"
    const eachRegex = /(?:pay|each|everyone)\s+\$?([\d,]+(?:\.\d+)?)(?:\s+each)?/i;
    const eachMatch = normalized.match(eachRegex);
    if (eachMatch) {
      fixedAmount = parseFloat(eachMatch[1].replace(/,/g, ''));
      if (!isNaN(fixedAmount)) {
        distStyle = 'fixed';
      }
    }
  }

  // Helper log message about sorting
  const sortLog = sortStrategy === 'smallest_owed' 
    ? 'sorted by smallest owed balances first' 
    : sortStrategy === 'largest_owed' 
    ? 'sorted by largest owed balances first' 
    : 'sorted by rotational queue (longest unpaid first)';

  // 4. Execute Selected Payout Allocation Logic
  const selectedEmails = new Map<string, number>();

  if (distStyle === 'split') {
    // split total budget evenly among candidates (or N candidates if specified)
    if (budgetCap === null || budgetCap <= 0) {
      return { records, log: 'Error: Please specify a budget amount to split (e.g. "split $5000").' };
    }

    // Extract optional limit of people (e.g. "among 37 people")
    const peopleMatch = normalized.match(/among\s+(\d+)\s+people/i);
    const limitPeople = peopleMatch ? parseInt(peopleMatch[1], 10) : candidates.length;
    const countToPay = Math.min(limitPeople, candidates.length);

    if (countToPay === 0) {
      return { records, log: 'Error: No eligible candidates found.' };
    }

    const splitVal = Number((budgetCap / countToPay).toFixed(2));
    const targets = candidates.slice(0, countToPay);
    
    for (const t of targets) {
      selectedEmails.set(t.email.toLowerCase(), Math.min(splitVal, t.owed));
    }
  } else if (distStyle === 'proportional') {
    if (budgetCap === null || budgetCap <= 0) {
      return { records, log: 'Error: Please specify a budget amount to distribute (e.g. "distribute $5000 proportional").' };
    }

    const totalOwed = candidates.reduce((sum, r) => sum + r.owed, 0);
    for (const c of candidates) {
      const prop = c.owed / totalOwed;
      const amount = Number(Math.min(prop * budgetCap, c.owed).toFixed(2));
      if (amount > 0) {
        selectedEmails.set(c.email.toLowerCase(), amount);
      }
    }
  } else if (distStyle === 'fixed') {
    // pay fixed amount per person up to optional budgetCap
    const amt = fixedAmount ?? 0;
    let currentSum = 0;
    
    // Extract optional limit of people: e.g. "pay 25 people $100"
    const peopleMatch = normalized.match(/(\d+)\s+people/i);
    const limitPeople = peopleMatch ? parseInt(peopleMatch[1], 10) : candidates.length;

    for (const c of candidates) {
      if (selectedEmails.size >= limitPeople) break;
      
      const payout = Math.min(amt, c.owed);
      if (budgetCap !== null && currentSum + payout > budgetCap) {
        // Capped by budget limit
        const remainder = budgetCap - currentSum;
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
    // Greedy Full accumulation (default style): pay full balance of each person one-by-one until budget is spent
    let currentSum = 0;
    
    for (const c of candidates) {
      const payout = c.owed;
      
      if (budgetCap !== null) {
        if (currentSum >= budgetCap) {
          break;
        }
        if (currentSum + payout > budgetCap) {
          const remainder = budgetCap - currentSum;
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

  // 5. Update and return records based on selected Map
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

  return {
    records: updatedRecords,
    log: `Instruction applied: Allocated funds using ${styleDesc} (${sortLog}). Selected ${selectedCount} people, total calculation: $${finalSum.toFixed(2)}.`,
  };
}
