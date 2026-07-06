/**
 * Reset production attendance data and restore default credentials.
 *
 * - Deletes all attendance + absence records
 * - Sets every employee password to demo123 (must change on login)
 * - Sets every employee PIN to 123456
 * - Clears last_login_at / password_changed_at for first-login WA flow
 *
 * Usage (on VPS):
 *   sudo docker compose exec -T backend node dist/scripts/reset-attendance-and-credentials.js
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'demo123';
const DEFAULT_PIN = '123456';

async function main() {
  const prisma = new PrismaClient();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, rounds);
  const pinHash = await bcrypt.hash(DEFAULT_PIN, rounds);

  console.log('[RESET] Deleting attendance records...');
  const attendance = await prisma.attendance.deleteMany({});
  console.log(`[RESET] ✓ Deleted ${attendance.count} attendance row(s)`);

  console.log('[RESET] Deleting absence records...');
  const absence = await prisma.absenceRecord.deleteMany({});
  console.log(`[RESET] ✓ Deleted ${absence.count} absence row(s)`);

  console.log('[RESET] Resetting employee passwords and PINs...');
  const employees = await prisma.employee.updateMany({
    data: {
      password_hash: passwordHash,
      must_change_password: true,
      password_changed_at: null,
      last_login_at: null,
      pin_hash: pinHash,
      pin_changed_at: null,
    },
  });
  console.log(`[RESET] ✓ Updated ${employees.count} employee(s)`);
  console.log(`[RESET] Password: ${DEFAULT_PASSWORD} | PIN: ${DEFAULT_PIN}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[RESET] FAILED:', err);
  process.exit(1);
});
