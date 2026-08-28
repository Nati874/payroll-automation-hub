import { parseMoneyValue } from './parser';

export interface AutomationRecord {
  email: string;
  name: string;
  amount: number;
  rowNumber: number;
}

export interface AutomationLog {
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

/**
 * Fetches sheet data using the Google Sheets API.
 */
export async function fetchGoogleSheetData(
  spreadsheetId: string,
  range: string,
  accessToken: string,
  apiKey: string
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to retrieve spreadsheet data: ${errData.error?.message || response.statusText}`
    );
  }

  const result = await response.json();
  return result.values || [];
}

/**
 * Parses spreadsheet rows looking for columns containing 'paid' status and extracts adjacent amounts.
 */
export function parseSheetPaidRecords(rows: string[][]): AutomationRecord[] {
  if (rows.length === 0) return [];

  // Identify headers from the first row
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  
  // Find index of email, name, status/paid, and amount columns
  const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('addr'));
  const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('voter') || h.includes('person'));
  
  // Look for status or "paid" label
  let paidStatusIdx = headers.findIndex((h) => h === 'paid' || h === 'status' || h.includes('pay status') || h.includes('state'));
  
  // Look for amount or owed label
  let amountIdx = headers.findIndex(
    (h) => h.includes('amount') || h.includes('owed') || h.includes('payout') || h.includes('usd') || h.includes('pay')
  );

  // If no structured headers match, fallback to checking column index guesses
  const finalEmailIdx = emailIdx !== -1 ? emailIdx : 0;
  const finalNameIdx = nameIdx !== -1 ? nameIdx : 1;
  const finalPaidIdx = paidStatusIdx !== -1 ? paidStatusIdx : 2;
  const finalAmountIdx = amountIdx !== -1 ? amountIdx : 3;

  const records: AutomationRecord[] = [];

  // Start reading from row index 1 (skip header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0) continue;

    const email = row[finalEmailIdx] ? row[finalEmailIdx].trim() : '';
    const name = row[finalNameIdx] ? row[finalNameIdx].trim() : 'Unknown';
    const statusVal = row[finalPaidIdx] ? row[finalPaidIdx].trim().toLowerCase() : '';
    const amountVal = row[finalAmountIdx] ? row[finalAmountIdx].trim() : '';

    // Check if status is explicitly 'paid', 'true', 'yes', or '1'
    const isPaid =
      statusVal === 'paid' ||
      statusVal === 'true' ||
      statusVal === 'yes' ||
      statusVal === '1' ||
      statusVal === 'y';

    if (isPaid && email && email.includes('@')) {
      const amount = parseMoneyValue(amountVal);
      records.push({
        email,
        name,
        amount,
        rowNumber: i + 1, // 1-indexed spreadsheet row
      });
    }
  }

  return records;
}

/**
 * Sequential HTTP request executor with rate limiting delay.
 */
export async function runSequentialPayoutRequests(
  records: AutomationRecord[],
  targetUrl: string,
  authHeader: string,
  delayMs: number,
  onLog: (log: AutomationLog) => void,
  onProgress: (currentIndex: number) => void
): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0;
  let failureCount = 0;

  onLog({
    timestamp: new Date().toLocaleTimeString(),
    type: 'info',
    message: `Starting execution sequence for ${records.length} paid records. Delay: ${delayMs}ms`,
  });

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    onProgress(i);

    onLog({
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: `[${i + 1}/${records.length}] Dispatching request for ${record.email} (Row ${record.rowNumber}) - Amount: $${record.amount}`,
    });

    try {
      // Replicate payout creation payload
      const payload = {
        email: record.email,
        name: record.name,
        amountUSD: record.amount,
        status: 'paid',
        timestamp: new Date().toISOString(),
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (authHeader.trim()) {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        successCount++;
        onLog({
          timestamp: new Date().toLocaleTimeString(),
          type: 'success',
          message: `[Success] Payout recorded for ${record.email} (Status: ${response.status})`,
        });
      } else {
        failureCount++;
        const responseText = await response.text().catch(() => '');
        onLog({
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          message: `[Failed] Server rejected ${record.email} (Status: ${response.status}). Details: ${responseText.substring(0, 100)}`,
        });
      }
    } catch (err: any) {
      failureCount++;
      onLog({
        timestamp: new Date().toLocaleTimeString(),
        type: 'error',
        message: `[Error] Request failed for ${record.email}: ${err.message}`,
      });
    }

    // Delay before the next request (omit delay after last record)
    if (i < records.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  onProgress(records.length);
  onLog({
    timestamp: new Date().toLocaleTimeString(),
    type: 'info',
    message: `Execution complete. Success: ${successCount}, Failures: ${failureCount}`,
  });

  return { successCount, failureCount };
}
