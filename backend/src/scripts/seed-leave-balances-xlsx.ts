/**
 * Seed leave balances from Darwin Box Excel export (sheet: Keseluruhan).
 *
 * Usage:
 *   npx ts-node src/scripts/seed-leave-balances-xlsx.ts --dry-run
 *   npx ts-node src/scripts/seed-leave-balances-xlsx.ts
 *
 * Env:
 *   LEAVE_XLSX_PATH  — path to .xlsx (default: backend/data/leave-cuti.xlsx, gitignored)
 *   LEAVE_SEED_YEAR  — balance year (default: current year)
 */
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import { toLeaveDays } from '../shared/utils/leave-days.util';
import {
  loadLeaveWorkbook,
  parseKeseluruhanSheet,
} from './lib/parse-leave-xlsx';

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');

const XLSX_PATH =
  process.env.LEAVE_XLSX_PATH ||
  path.resolve(process.cwd(), 'data', 'leave-cuti.xlsx');

const SEED_YEAR = parseInt(
  process.env.LEAVE_SEED_YEAR || String(new Date().getFullYear()),
  10,
);

async function main() {
  console.log(`[LEAVE-SEED] File: ${XLSX_PATH}`);
  console.log(`[LEAVE-SEED] Year: ${SEED_YEAR}`);
  console.log(`[LEAVE-SEED] Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`);

  const workbook = loadLeaveWorkbook(XLSX_PATH);
  const parsed = parseKeseluruhanSheet(workbook);
  console.log(`[LEAVE-SEED] Parsed ${parsed.length} rows from Keseluruhan`);

  const employees = await prisma.employee.findMany({
    select: { id: true, employee_code: true, full_name: true },
  });
  const byCode = new Map(
    employees.map((e) => [String(e.employee_code).replace(/\.0$/, ''), e]),
  );

  let matched = 0;
  let upserted = 0;
  let skipped = 0;
  const unmatched: string[] = [];
  const warnings: string[] = [];

  for (const row of parsed) {
    const emp = byCode.get(row.employee_number);
    if (!emp) {
      unmatched.push(`${row.employee_number} — ${row.employee_name}`);
      continue;
    }

    if (row.leave_ongoing === null) {
      warnings.push(`${row.employee_number}: leave_ongoing kosong, dilewati`);
      skipped++;
      continue;
    }

    matched++;
    const remaining = toLeaveDays(row.leave_ongoing);
    const used = toLeaveDays(row.used_days);
    const entitlement = toLeaveDays(remaining + used);

    if (remaining < 0) {
      warnings.push(
        `${row.employee_number} ${row.employee_name}: saldo negatif (${remaining})`,
      );
    }

    console.log(
      `  ${emp.employee_code} ${emp.full_name.padEnd(28)} ` +
        `sisa=${String(remaining).padStart(6)} used=${String(used).padStart(5)} ` +
        `hak=${String(entitlement).padStart(6)}`,
    );

    if (!DRY_RUN) {
      await prisma.leaveBalance.upsert({
        where: {
          employee_id_year: {
            employee_id: emp.id,
            year: SEED_YEAR,
          },
        },
        update: {
          total_entitlement: entitlement,
          used_days: used,
          remaining_days: remaining,
          carryover_days: 0,
          last_calculated_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          employee_id: emp.id,
          year: SEED_YEAR,
          total_entitlement: entitlement,
          used_days: used,
          remaining_days: remaining,
          carryover_days: 0,
        },
      });
      upserted++;
    }
  }

  console.log('\n[LEAVE-SEED] Summary');
  console.log(`  Parsed:    ${parsed.length}`);
  console.log(`  Matched:   ${matched}`);
  console.log(`  Upserted:  ${DRY_RUN ? 0 : upserted}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Unmatched: ${unmatched.length}`);

  if (unmatched.length) {
    console.log('\n[LEAVE-SEED] Karyawan tidak ditemukan di DB (employee_code):');
    unmatched.forEach((u) => console.log(`  - ${u}`));
  }

  if (warnings.length) {
    console.log('\n[LEAVE-SEED] Peringatan:');
    warnings.forEach((w) => console.log(`  ! ${w}`));
  }

  if (DRY_RUN) {
    console.log('\n[LEAVE-SEED] Dry run selesai — tidak ada perubahan DB.');
  } else {
    console.log('\n[LEAVE-SEED] ✓ Selesai.');
  }
}

main()
  .catch((err) => {
    console.error('[LEAVE-SEED] Gagal:', err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
