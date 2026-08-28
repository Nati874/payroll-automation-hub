import type { PayoutRecord } from '../types';

// Extend window interface for Google Identity Services global
declare global {
  interface Window {
    google: any;
  }
}

/**
 * Requests an OAuth2 access token for the Google Sheets API from the user.
 */
export function requestGoogleAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.oauth2) {
      reject(
        new Error(
          'Google Identity Services client library is not loaded. Please check your internet connection and ensure script is allowed.'
        )
      );
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(`OAuth error: ${response.error} - ${response.error_description || ''}`));
          } else if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('OAuth authentication succeeded but no access token was returned.'));
          }
        },
      });
      // Force prompt consent screen to allow easy switches/fresh logins
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(new Error(`Failed to initialize Google Auth client: ${err.message}`));
    }
  });
}

/**
 * Appends a new sheet tab to the designated Google Spreadsheet and populates it with the payroll records.
 */
export async function exportPayrollToGoogleSheet(
  spreadsheetId: string,
  accessToken: string,
  apiKey: string,
  records: PayoutRecord[],
  exchangeRate: number
): Promise<string> {
  const dateStr = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(/,/, '').replace(/\s+/g, '_').replace(/:/g, '-');
  
  const sheetTitle = `Payroll_${dateStr}`;

  // 1. Send request to create a new sheet in the spreadsheet
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate?key=${apiKey}`;
  const addSheetBody = {
    requests: [
      {
        addSheet: {
          properties: {
            title: sheetTitle,
            gridProperties: {
              frozenRowCount: 1, // Freeze the header row
            },
          },
        },
      },
    ],
  };

  const addSheetResponse = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(addSheetBody),
  });

  if (!addSheetResponse.ok) {
    const errData = await addSheetResponse.json().catch(() => ({}));
    throw new Error(
      `Failed to create a new sheet tab: ${errData.error?.message || addSheetResponse.statusText}`
    );
  }

  // 2. Prepare values to write
  const headers = [
    'Full Name',
    'Email Address',
    'Bank Type',
    'Bank Account',
    'Owed (USD)',
    'Owed (ETB)',
    'Earned (USD)',
    'Paid (USD)',
    'Flagged (USD)',
  ];

  const rows = records.map((rec) => [
    rec.fullNameDB || rec.name,
    rec.email,
    rec.bankType || 'Not Linked',
    rec.bankAccount || 'Not Linked',
    rec.owed,
    parseFloat((rec.owed * exchangeRate).toFixed(2)),
    rec.earned,
    rec.paid,
    rec.flagged,
  ]);

  const valuesData = [headers, ...rows];

  // 3. Write data to the new sheet A1
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetTitle
  )}!A1?valueInputOption=USER_ENTERED&key=${apiKey}`;

  const writeResponse = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      values: valuesData,
    }),
  });

  if (!writeResponse.ok) {
    const errData = await writeResponse.json().catch(() => ({}));
    throw new Error(
      `Failed to write payroll rows: ${errData.error?.message || writeResponse.statusText}`
    );
  }

  return sheetTitle;
}
