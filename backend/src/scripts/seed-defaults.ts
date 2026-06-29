/**
 * TARA — Default Configuration Seeder
 *
 * Seeds essential default data on first run:
 * - System settings + AI Assistant defaults
 * - Agent configurations
 * - Demo org (department, office, employees with login)
 * - Sample SOP document for RAG testing
 *
 * Idempotent: uses upsert so it's safe to run multiple times.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo123';

async function main() {
  console.log('[SEED] Seeding default configuration...');

  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, rounds);

  // === 1. Agent Configurations ===
  const agents = [
    'leave_request',
    'absensi',
    'clock_confirmation',
    'weekly_checkin',
    'late_report',
    'onboarding',
    'saldo_cuti',
  ];

  for (const agent_name of agents) {
    await prisma.agentConfig.upsert({
      where: { agent_name },
      update: {},
      create: {
        agent_name,
        is_enabled: true,
        configuration: {},
        health_status: 'unknown',
      },
    });
  }
  console.log('[SEED] ✓ Agent configurations seeded');

  // === 2. Roles ===
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
  console.log('[SEED] ✓ Default roles seeded');

  const hrRole = await prisma.role.findUnique({ where: { role_name: 'HR_Admin' } });
  const superAdminRole = await prisma.role.findUnique({ where: { role_name: 'SuperAdmin' } });
  const supRole = await prisma.role.findUnique({ where: { role_name: 'Supervisor' } });
  const empRole = await prisma.role.findUnique({ where: { role_name: 'Employee' } });

  // === 3. Department & Office ===
  const department = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources', description: 'HR Department' },
  });

  const itDepartment = await prisma.department.upsert({
    where: { name: 'IT' },
    update: {},
    create: { name: 'IT', description: 'Information Technology' },
  });

  const office = await prisma.officeLocation.upsert({
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
  console.log('[SEED] ✓ Department & office seeded');

  // === 4. Demo Employees ===
  const sariId = '00000000-0000-4000-8000-000000000101';
  const budiId = '00000000-0000-4000-8000-000000000102';
  const rinaId = '00000000-0000-4000-8000-000000000103';
  const samuelId = '00000000-0000-4000-8000-000000000104';

  const ownerWa = process.env.SEED_OWNER_WHATSAPP || '6281234567890';
  const samuelWa = '6287728589845';

  await prisma.employee.upsert({
    where: { email: 'sari@majubersama.com' },
    update: {
      password_hash: passwordHash,
      whatsapp_number: ownerWa,
      whatsapp_opted_in: true,
      whatsapp_verified: true,
      whatsapp_verified_at: new Date(),
      phone: '+6281234567890',
    },
    create: {
      id: sariId,
      employee_code: 'ADM-001',
      full_name: 'Sari Wulandari',
      email: 'sari@majubersama.com',
      phone: '+6281234567890',
      password_hash: passwordHash,
      role_id: hrRole!.id,
      department_id: department.id,
      office_location_id: office.id,
      hire_date: new Date('2020-03-15'),
      employment_status: 'active',
      whatsapp_number: ownerWa,
      whatsapp_opted_in: true,
      whatsapp_verified: true,
      whatsapp_verified_at: new Date(),
    },
  });

  await prisma.employee.upsert({
    where: { email: 'budi@majubersama.com' },
    update: {
      password_hash: passwordHash,
      supervisor_id: sariId,
      whatsapp_number: '6281234567891',
      whatsapp_opted_in: true,
      whatsapp_verified: true,
      whatsapp_verified_at: new Date(),
      phone: '081234567891',
    },
    create: {
      id: budiId,
      employee_code: 'SUP-001',
      full_name: 'Budi Santoso',
      email: 'budi@majubersama.com',
      phone: '081234567891',
      password_hash: passwordHash,
      role_id: supRole!.id,
      department_id: department.id,
      office_location_id: office.id,
      supervisor_id: sariId,
      hire_date: new Date('2019-06-01'),
      employment_status: 'active',
      whatsapp_number: '6281234567891',
      whatsapp_opted_in: true,
      whatsapp_verified: true,
      whatsapp_verified_at: new Date(),
    },
  });

  await prisma.employee.upsert({
    where: { email: 'rina@majubersama.com' },
    update: {
      password_hash: passwordHash,
      supervisor_id: budiId,
      whatsapp_number: '6281234567892',
      whatsapp_opted_in: true,
      whatsapp_verified: true,
      whatsapp_verified_at: new Date(),
      phone: '081234567892',
    },
    create: {
      id: rinaId,
      employee_code: 'EMP-001',
      full_name: 'Rina Kartika',
      email: 'rina@majubersama.com',
      phone: '081234567892',
      password_hash: passwordHash,
      role_id: empRole!.id,
      department_id: department.id,
      office_location_id: office.id,
      supervisor_id: budiId,
      hire_date: new Date('2022-01-10'),
      employment_status: 'active',
      whatsapp_number: '6281234567892',
      whatsapp_opted_in: true,
      whatsapp_verified: true,
      whatsapp_verified_at: new Date(),
    },
  });

  await prisma.employee.upsert({
    where: { email: 'samuel@conextlab.ai' },
    update: {
      password_hash: passwordHash,
      full_name: 'Samuel Jason',
      phone: '087728589845',
      whatsapp_number: samuelWa,
      whatsapp_opted_in: true,
      whatsapp_verified: true,
      whatsapp_verified_at: new Date(),
      role_id: superAdminRole!.id,
      department_id: itDepartment.id,
    },
    create: {
      id: samuelId,
      employee_code: 'SA-001',
      full_name: 'Samuel Jason',
      email: 'samuel@conextlab.ai',
      phone: '087728589845',
      password_hash: passwordHash,
      role_id: superAdminRole!.id,
      department_id: itDepartment.id,
      office_location_id: office.id,
      hire_date: new Date('2024-01-01'),
      employment_status: 'active',
      whatsapp_number: samuelWa,
      whatsapp_opted_in: true,
      whatsapp_verified: true,
      whatsapp_verified_at: new Date(),
    },
  });
  console.log('[SEED] ✓ Demo employees seeded (password: demo123)');

  // === 5. Leave Balances ===
  const year = new Date().getFullYear();
  for (const empId of [sariId, budiId, rinaId, samuelId]) {
    await prisma.leaveBalance.upsert({
      where: { employee_id_year: { employee_id: empId, year } },
      update: {},
      create: {
        employee_id: empId,
        year,
        total_entitlement: 12,
        used_days: 2,
        remaining_days: 10,
        carryover_days: 0,
      },
    });
  }
  console.log('[SEED] ✓ Leave balances seeded');

  // === 6. AI Assistant defaults (OpenRouter) ===
  const aiSettings = [
    { key: 'ai.enabled', value: process.env.AI_API_KEY ? true : false, category: 'ai' },
    { key: 'ai.provider', value: 'openrouter', category: 'ai' },
    { key: 'ai.api_key', value: process.env.AI_API_KEY || '', category: 'ai' },
    { key: 'ai.base_url', value: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1', category: 'ai' },
    { key: 'ai.model', value: process.env.AI_MODEL || 'deepseek-v4-flash', category: 'ai' },
    { key: 'ai.max_tokens', value: 1024, category: 'ai' },
    { key: 'ai.temperature', value: 0.3, category: 'ai' },
    { key: 'ai.response_language', value: 'id', category: 'ai' },
    { key: 'ai.confirmation_timeout_minutes', value: 60, category: 'ai' },
    { key: 'ai.system_prompt_override', value: '', category: 'ai' },
  ];

  for (const s of aiSettings) {
    await prisma.systemSettings.upsert({
      where: { setting_key: s.key },
      update: { setting_value: s.value, setting_category: s.category },
      create: {
        setting_key: s.key,
        setting_value: s.value,
        setting_category: s.category,
        description: 'TARA AI Assistant configuration',
      },
    });
  }
  console.log('[SEED] ✓ AI Assistant config seeded');

  // === 7. WhatsApp (Kapso) defaults ===
  const waSettings = [
    {
      key: 'whatsapp.ai_enabled',
      value: !!process.env.KAPSO_API_KEY,
      category: 'whatsapp',
    },
    {
      key: 'whatsapp.kapso_api_key',
      value: process.env.KAPSO_API_KEY || '',
      category: 'whatsapp',
    },
    {
      key: 'whatsapp.phone_number_id',
      value: process.env.KAPSO_PHONE_NUMBER_ID || '1177690982091942',
      category: 'whatsapp',
    },
    {
      key: 'whatsapp.business_number',
      value: process.env.KAPSO_BUSINESS_NUMBER || '+6285196416317',
      category: 'whatsapp',
    },
    {
      key: 'whatsapp.webhook_verify_token',
      value: process.env.KAPSO_WEBHOOK_SECRET || 'tara-local-dev',
      category: 'whatsapp',
    },
  ];

  for (const s of waSettings) {
    await prisma.systemSettings.upsert({
      where: { setting_key: s.key },
      update: { setting_value: s.value, setting_category: s.category },
      create: {
        setting_key: s.key,
        setting_value: s.value,
        setting_category: s.category,
        description: 'WhatsApp Kapso configuration',
      },
    });
  }
  console.log('[SEED] ✓ WhatsApp config seeded');

  // === 8. System Settings ===
  const settings = [
    {
      setting_key: 'attendance_config',
      setting_category: 'attendance',
      setting_value: {
        clock_in_threshold: '09:00',
        timezone: 'Asia/Jakarta',
        geofence_enabled: true,
        default_geofence_radius_meters: 200,
        attendance_sources: ['phone', 'aws_device'],
      },
      description: 'Attendance system configuration',
    },
    {
      setting_key: 'leave_config',
      setting_category: 'leave',
      setting_value: {
        default_annual_entitlement: 12,
        carryover_max_days: 5,
        carryover_expiry_months: 3,
        min_advance_days: 3,
        auto_balance_calculation: true,
      },
      description: 'Leave management configuration',
    },
    {
      setting_key: 'notification_config',
      setting_category: 'notification',
      setting_value: {
        channels: { in_app: true, whatsapp: true, telegram: false, email: false },
        quiet_hours: { enabled: false, start: '22:00', end: '07:00' },
      },
      description: 'Notification delivery configuration',
    },
    {
      setting_key: 'hermes_integration',
      setting_category: 'integrations',
      setting_value: {
        enabled: false,
        connection_url: '',
        api_key: '',
        webhook_secret: '',
        retry_policy: { max_retries: 3, backoff_ms: 1000 },
        agents: [],
        event_filter: [],
      },
      description: 'Hermes integration (disabled — use TARA AI)',
    },
  ];

  for (const setting of settings) {
    await prisma.systemSettings.upsert({
      where: { setting_key: setting.setting_key },
      update: {},
      create: setting,
    });
  }
  console.log('[SEED] ✓ System settings seeded');

  // === 9. Sample SOP PDF for RAG testing ===
  const uploadDir =
    process.env.SOP_UPLOAD_DIR || path.resolve(process.cwd(), 'uploads', 'sop');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const sopFileName = 'seed-sop-cuti-karyawan.pdf';
  const sopFilePath = path.join(uploadDir, sopFileName);
  const sopContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 320>>stream
BT
/F1 11 Tf
50 750 Td
(SOP CUTI KARYAWAN - RALALI) Tj
0 -20 Td
(1. Pengajuan cuti tahunan minimal 3 hari kerja sebelum tanggal cuti.) Tj
0 -16 Td
(2. Cuti sakit wajib melampirkan surat keterangan dokter.) Tj
0 -16 Td
(3. Maksimal cuti tahunan 12 hari per tahun kalender.) Tj
0 -16 Td
(4. Cuti tidak dapat diambil bersamaan dengan hari libur nasional.) Tj
0 -16 Td
(5. Sisa cuti maksimal 5 hari dapat dibawa ke tahun berikutnya.) Tj
ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
0000000212 00000 n 
0000000584 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
652
%%EOF`;

  fs.writeFileSync(sopFilePath, sopContent);

  const sopDoc = await prisma.sopDocument.upsert({
    where: { id: '00000000-0000-4000-8000-000000000201' },
    update: {
      title: 'SOP Cuti Karyawan',
      description: 'Prosedur pengajuan dan ketentuan cuti tahunan, cuti sakit, dan carryover',
      category: 'HR',
      file_name: sopFileName,
      file_path: sopFileName,
      file_size: Buffer.byteLength(sopContent),
      is_active: true,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000201',
      title: 'SOP Cuti Karyawan',
      description: 'Prosedur pengajuan dan ketentuan cuti tahunan, cuti sakit, dan carryover',
      category: 'HR',
      file_name: sopFileName,
      file_path: sopFileName,
      file_size: Buffer.byteLength(sopContent),
      mime_type: 'application/pdf',
      uploaded_by: sariId,
      is_active: true,
    },
  });

  // Pre-index text chunk for immediate keyword RAG; embeddings added by test:ai-e2e
  const sopChunkText =
    '[SOP Cuti Karyawan] SOP CUTI KARYAWAN - RALALI. 1. Pengajuan cuti tahunan minimal 3 hari kerja sebelum tanggal cuti. 2. Cuti sakit wajib melampirkan surat keterangan dokter. 3. Maksimal cuti tahunan 12 hari per tahun kalender. 4. Cuti tidak dapat diambil bersamaan dengan hari libur nasional. 5. Sisa cuti maksimal 5 hari dapat dibawa ke tahun berikutnya.';
  await prisma.sopChunk.deleteMany({ where: { sop_document_id: sopDoc.id } });
  await prisma.sopChunk.create({
    data: {
      sop_document_id: sopDoc.id,
      chunk_index: 0,
      content: sopChunkText,
      embedding: [],
      token_count: sopChunkText.split(/\s+/).length,
    },
  });
  console.log('[SEED] ✓ Sample SOP PDF + text chunk created:', sopDoc.title);

  console.log('');
  console.log('[SEED] ✓ All defaults seeded successfully');
  console.log('');
  console.log('Demo accounts (password: demo123):');
  console.log('  Super Admin: samuel@conextlab.ai  WA:', samuelWa);
  console.log('  HR Admin:    sari@majubersama.com  WA:', ownerWa);
  console.log('  Supervisor:  budi@majubersama.com  WA: 6281234567891');
  console.log('  Employee:    rina@majubersama.com  WA: 6281234567892');
  console.log('');
  console.log('Next: npm run test:ai-e2e  (index SOP + test RAG + WA AI)');
}

main()
  .catch((e) => {
    console.error('[SEED] Error:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
