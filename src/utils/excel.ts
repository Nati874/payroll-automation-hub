import * as XLSX from 'xlsx';
import type { PayoutRecord } from '../types';

/**
 * Generates and downloads an Excel (.xlsx) file client-side.
 */
export function exportPayrollToExcel(
  records: PayoutRecord[],
  exchangeRate: number,
  fileName: string = 'payment.xlsx'
) {
  // Map records to formatted columns matching exactly:
  // email | name | method | account no | dollar | birr | status | record
  const data = records.map((rec) => ({
    'email': rec.email,
    'name': rec.fullNameDB || rec.name,
    'method': rec.bankType || 'CBE',
    'account no': rec.bankAccount || '',
    'dollar': rec.owed,
    'birr': parseFloat((rec.owed * exchangeRate).toFixed(2)),
    'status': '', // empty
    'record': '', // empty
  }));

  // Create worksheet from JSON
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for professional presentation
  worksheet['!cols'] = [
    { wch: 30 }, // email
    { wch: 25 }, // name
    { wch: 12 }, // method
    { wch: 22 }, // account no
    { wch: 12 }, // dollar
    { wch: 15 }, // birr
    { wch: 12 }, // status
    { wch: 12 }, // record
  ];

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'payment');

  // Trigger browser download
  XLSX.writeFile(workbook, fileName);
}
