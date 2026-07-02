import * as XLSX from 'xlsx';
import { toLeaveDays } from '../../shared/utils/leave-days.util';

export interface ParsedLeaveEmployee {
  employee_number: string;
  employee_name: string;
  join_date: string | null;
  sisa_mei: number | null;
  leave_ongoing: number | null;
  used_days: number;
  bersama_days: number;
}

function parseNum(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseJoinDate(value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 30000) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const mm = String(parsed.m).padStart(2, '0');
    const dd = String(parsed.d).padStart(2, '0');
    return `${parsed.y}-${mm}-${dd}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

/**
 * Parse the "Keseluruhan" sheet from the Darwin Box leave export.
 */
export function parseKeseluruhanSheet(
  workbook: XLSX.WorkBook,
): ParsedLeaveEmployee[] {
  const sheet = workbook.Sheets['Keseluruhan'];
  if (!sheet) {
    throw new Error('Sheet "Keseluruhan" tidak ditemukan di file Excel');
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (rows.length < 3) return [];

  const header = rows[0] as unknown[];
  const subHeader = rows[1] as unknown[];

  // Month columns: pairs of [Cuti Bersama, Cuti Terpakai] from col index 6
  const monthPairs: Array<{ col: number; month: string }> = [];
  for (let ci = 6; ci < header.length; ci += 2) {
    const month = String(header[ci + 1] ?? '').trim();
    if (!month || month === '1.0' || month.toLowerCase() === 'cuti bersama') continue;
    if (String(subHeader[ci] ?? '').toLowerCase().includes('bersama')) {
      monthPairs.push({ col: ci, month });
    }
  }

  const employees: ParsedLeaveEmployee[] = [];

  for (let ri = 2; ri < rows.length; ri++) {
    const row = rows[ri] as unknown[];
    const empNo = String(row[1] ?? '').trim().replace(/\.0$/, '');
    if (!empNo || !/^\d+$/.test(empNo)) continue;

    let usedSum = 0;
    let bersamaSum = 0;
    for (const { col } of monthPairs) {
      const bersama = parseNum(row[col]) ?? 0;
      const terpakai = parseNum(row[col + 1]) ?? 0;
      bersamaSum += bersama;
      usedSum += terpakai;
    }

    employees.push({
      employee_number: empNo,
      employee_name: String(row[2] ?? '').trim(),
      join_date: parseJoinDate(row[3]),
      sisa_mei: parseNum(row[4]),
      leave_ongoing: parseNum(row[5]),
      used_days: toLeaveDays(usedSum),
      bersama_days: toLeaveDays(bersamaSum),
    });
  }

  return employees;
}

export function loadLeaveWorkbook(filePath: string): XLSX.WorkBook {
  return XLSX.readFile(filePath, { cellDates: true });
}
