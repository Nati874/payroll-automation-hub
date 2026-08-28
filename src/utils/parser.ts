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
