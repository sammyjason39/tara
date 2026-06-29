/**
 * TARA — Ralali Employee Seeder
 *
 * Wipes all employees (+ dependent records) and seeds from CSV.
 * SuperAdmins: Samuel Jason, Irwan Suryady, Ahmad Yani, Tony Rafles Sibarani.
 * All others: Employee role.
 *
 * Usage: npm run seed:ralali
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'demo123';
const CSV_PATH =
  process.env.RALALI_EMPLOYEES_CSV ||
  path.resolve(process.cwd(), 'data/ralali-employees-2026.csv');

const SUPER_ADMIN_EMAILS = new Set([
  'samuel.jason@majubersama.com',
  'irwan@ralali.com',
  'ahmad.yani@ralali.com',
  'tony.sibarani@ralali.com',
]);

const SAMUEL = {
  employee_code: 'SA-001',
  full_name: 'Samuel Jason',
  email: 'samuel.jason@majubersama.com',
  phone: '087728589845',
  whatsapp_number: '6287728589845',
  department: 'Technology',
  hire_date: '2024-01-01',
};

const ID_MONTHS: Record<string, number> = {
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  may: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  aug: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  oct: 9,
  okt: 9,
  november: 10,
  nov: 10,
  desember: 11,
  dec: 11,
  des: 11,
};

interface CsvRow {
  employeeNumber: string;
  fullName: string;
  joinDate: string;
  resignationDate: string;
  division: string;
  department: string;
  jobPosition: string;
  gender: string;
  phone: string;
  email: string;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function loadCsv(filePath: string): CsvRow[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    if (c.length < 10) continue;

    rows.push({
      employeeNumber: c[1],
      fullName: c[2].trim(),
      joinDate: c[3],
      resignationDate: c[4],
      division: c[5].trim(),
      department: c[6].trim(),
      jobPosition: c[7].trim(),
      gender: c[8].trim(),
      phone: c[9].trim(),
      email: c[10].trim().toLowerCase(),
    });
  }

  return rows;
}

function parseDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;

  const en = Date.parse(v.replace(/-/g, ' '));
  if (!Number.isNaN(en)) return new Date(en);

  const idMatch = v.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (idMatch) {
    const day = parseInt(idMatch[1], 10);
    const monthKey = idMatch[2].toLowerCase();
    const year = parseInt(idMatch[3], 10);
    const month = ID_MONTHS[monthKey];
    if (month !== undefined) return new Date(year, month, day);
  }

  const dmy = v.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const monthKey = dmy[2].toLowerCase().slice(0, 3);
    const year = parseInt(dmy[3], 10);
    const month = ID_MONTHS[monthKey];
    if (month !== undefined) return new Date(year, month, day);
  }

  return null;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

async function ensureRoles() {
  const roles = [
    { role_name: 'SuperAdmin', permissions: { all: true } },
    { role_name: 'HR_Admin', permissions: { hr: true, employees: true, reports: true } },
    { role_name: 'Supervisor', permissions: { team: true, leave_approval: true, reports: true } },
    { role_name: 'Employee', permissions: { self: true } },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { role_name: role.role_name },
      update: {},
      create: { role_name: role.role_name, permissions: role.permissions },
    });
  }

  return {
    superAdmin: await prisma.role.findUniqueOrThrow({ where: { role_name: 'SuperAdmin' } }),
    employee: await prisma.role.findUniqueOrThrow({ where: { role_name: 'Employee' } }),
  };
}

async function ensureOffice() {
  return prisma.officeLocation.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      location_name: 'Ralali Headquarter',
      address: 'Jakarta, Indonesia',
      latitude: -6.2088,
      longitude: 106.8456,
      geofence_radius_meters: 200,
    },
  });
}

const departmentCache = new Map<string, string>();

async function getOrCreateDepartment(name: string): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;

  const cached = departmentCache.get(clean);
  if (cached) return cached;

  const dept = await prisma.department.upsert({
    where: { name: clean },
    update: {},
    create: { name: clean, description: `Ralali — ${clean}` },
  });
  departmentCache.set(clean, dept.id);
  return dept.id;
}

async function wipeEmployeeData() {
  console.log('[RALALI] Wiping employee-related data...');

  await prisma.aiPendingAction.deleteMany();
  await prisma.aiAgentLog.deleteMany();
  await prisma.whatsAppMessageLog.deleteMany();
  await prisma.whatsAppSession.deleteMany();
  await prisma.hermesFollowUp.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.scheduleAssignment.deleteMany();
  await prisma.absenceRecord.deleteMany();
  await prisma.offlineActionQueue.deleteMany();
  await prisma.aWSDeviceMapping.deleteMany();
  await prisma.onboardingStatus.deleteMany();
  await prisma.weeklyCheckin.deleteMany();
  await prisma.warningLetter.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.attendance.deleteMany();

  await prisma.sopDocument.updateMany({ data: { uploaded_by: null } });
  await prisma.department.updateMany({ data: { manager_id: null } });
  await prisma.employee.updateMany({
    data: { supervisor_id: null, created_by: null, updated_by: null },
  });

  const deleted = await prisma.employee.deleteMany();
  console.log(`[RALALI] ✓ Deleted ${deleted.count} employees`);
}

async function seedEmployee(params: {
  employee_code: string;
  full_name: string;
  email: string;
  phone?: string | null;
  whatsapp_number?: string | null;
  departmentName?: string | null;
  hire_date: Date;
  employment_status: string;
  role_id: string;
  office_id: string;
  password_hash: string;
}) {
  const department_id = params.departmentName
    ? await getOrCreateDepartment(params.departmentName)
    : null;

  const wa = params.whatsapp_number || (params.phone ? normalizePhone(params.phone) : null);

  const employee = await prisma.employee.create({
    data: {
      employee_code: params.employee_code,
      full_name: params.full_name,
      email: params.email,
      phone: params.phone || null,
      password_hash: params.password_hash,
      role_id: params.role_id,
      department_id,
      office_location_id: params.office_id,
      hire_date: params.hire_date,
      employment_status: params.employment_status,
      whatsapp_number: wa,
      whatsapp_opted_in: !!wa,
      whatsapp_verified: !!wa,
      whatsapp_verified_at: wa ? new Date() : null,
    },
  });

  const year = new Date().getFullYear();
  await prisma.leaveBalance.create({
    data: {
      employee_id: employee.id,
      year,
      total_entitlement: 12,
      used_days: 0,
      remaining_days: 12,
      carryover_days: 0,
    },
  });

  return employee;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV not found: ${CSV_PATH}`);
  }

  console.log('[RALALI] Loading employees from:', CSV_PATH);
  const rows = loadCsv(CSV_PATH);
  console.log(`[RALALI] Found ${rows.length} rows in CSV`);

  const roles = await ensureRoles();
  const office = await ensureOffice();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, rounds);

  await wipeEmployeeData();

  let superAdminCount = 0;
  let employeeCount = 0;
  const skipped: string[] = [];
  const unmappedFields = { jobPosition: 0, gender: 0, divisionOnly: 0 };

  for (const row of rows) {
    if (!row.email) {
      skipped.push(`${row.fullName} (no email)`);
      continue;
    }

    const deptName = row.department || row.division;
    if (!row.department && row.division) unmappedFields.divisionOnly++;
    if (row.jobPosition) unmappedFields.jobPosition++;
    if (row.gender) unmappedFields.gender++;

    const hireDate = parseDate(row.joinDate) || new Date('2020-01-01');
    const isResigned = !!row.resignationDate.trim();
    const isSuperAdmin = SUPER_ADMIN_EMAILS.has(row.email);
    const phone = row.phone ? normalizePhone(row.phone) : null;

    await seedEmployee({
      employee_code: String(row.employeeNumber),
      full_name: row.fullName,
      email: row.email,
      phone: phone ? `+${phone}` : null,
      whatsapp_number: phone,
      departmentName: deptName,
      hire_date: hireDate,
      employment_status: isResigned ? 'resigned' : 'active',
      role_id: isSuperAdmin ? roles.superAdmin.id : roles.employee.id,
      office_id: office.id,
      password_hash,
    });

    if (isSuperAdmin) superAdminCount++;
    else employeeCount++;
  }

  // Samuel Jason — not in CSV, always SuperAdmin
  if (!SUPER_ADMIN_EMAILS.has(SAMUEL.email)) {
    throw new Error('Samuel email missing from SUPER_ADMIN_EMAILS');
  }

  const samuelExists = rows.some((r) => r.email === SAMUEL.email);
  if (!samuelExists) {
    await seedEmployee({
      employee_code: SAMUEL.employee_code,
      full_name: SAMUEL.full_name,
      email: SAMUEL.email,
      phone: SAMUEL.phone,
      whatsapp_number: SAMUEL.whatsapp_number,
      departmentName: SAMUEL.department,
      hire_date: parseDate(SAMUEL.hire_date)!,
      employment_status: 'active',
      role_id: roles.superAdmin.id,
      office_id: office.id,
      password_hash,
    });
    superAdminCount++;
    console.log('[RALALI] ✓ Added Samuel Jason (SuperAdmin)');
  }

  console.log('');
  console.log('[RALALI] ✓ Seed complete');
  console.log(`  SuperAdmins: ${superAdminCount}`);
  console.log(`  Employees:   ${employeeCount}`);
  console.log(`  Password:    ${DEFAULT_PASSWORD}`);
  console.log('');
  console.log('SuperAdmin accounts:');
  console.log('  samuel.jason@majubersama.com');
  console.log('  irwan@ralali.com');
  console.log('  ahmad.yani@ralali.com');
  console.log('  tony.sibarani@ralali.com');
  console.log('');

  if (skipped.length) {
    console.log('Skipped rows:', skipped.join(', '));
  }

  if (unmappedFields.jobPosition || unmappedFields.gender) {
    console.log(
      '[RALALI] Note: Job Position & Gender from CSV are not stored (no DB columns yet).',
    );
  }
}

main()
  .catch((e) => {
    console.error('[RALALI] Error:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
