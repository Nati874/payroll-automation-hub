import * as XLSX from 'xlsx';
import type { PayoutRecord } from '../types';

/**
 * Generates and downloads an Excel (.xlsx) file client-side.
 */
export function exportPayrollToExcel(
  records: PayoutRecord[],
  exchangeRate: number,
  fileName: string = 'payroll_summary.xlsx'
) {
  // Map records to formatted columns
  const data = records.map((rec) => ({
    'Full Name': rec.fullNameDB || rec.name,
    'Email Address': rec.email,
    'Bank Type': rec.bankType || 'Not Linked',
    'Bank Account': rec.bankAccount || 'Not Linked',
    'Owed (USD)': rec.owed,
    'Owed (ETB)': parseFloat((rec.owed * exchangeRate).toFixed(2)),
    'Earned (USD)': rec.earned,
    'Paid (USD)': rec.paid,
    'Flagged (USD)': rec.flagged,
  }));

  // Create worksheet from JSON
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for professional presentation
  worksheet['!cols'] = [
    { wch: 25 }, // Full Name
    { wch: 30 }, // Email Address
    { wch: 15 }, // Bank Type
    { wch: 25 }, // Bank Account
    { wch: 12 }, // Owed (USD)
    { wch: 15 }, // Owed (ETB)
    { wch: 15 }, // Earned (USD)
    { wch: 15 }, // Paid (USD)
    { wch: 15 }, // Flagged (USD)
  ];

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Summary');

  // Trigger browser download
  XLSX.writeFile(workbook, fileName);
}
