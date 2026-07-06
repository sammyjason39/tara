import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../../persistence/prisma.service';
import { normalizeWhatsAppPhone } from '../whatsapp/utils/phone-normalize.util';

export const BULK_SHEET_NAME = 'Data Karyawan';
export const BULK_GUIDE_SHEET = 'Panduan';

export const BULK_COLUMNS = {
  id: 'ID Sistem (jangan ubah)',
  employee_code: 'Nomor Pegawai',
  full_name: 'Nama Pegawai',
  email: 'Email',
  department: 'Departemen',
  role: 'Role',
  whatsapp_number: 'Nomor WhatsApp',
  supervisor_code: 'Atasan (Nomor Pegawai)',
} as const;

type BulkField = keyof typeof BULK_COLUMNS;

export interface BulkChange {
  field: string;
  label: string;
  old_value: string;
  new_value: string;
}

export interface BulkPreviewRow {
  row_number: number;
  employee_id: string | null;
  employee_code: string;
  full_name: string;
  status: 'ok' | 'warning' | 'error' | 'unchanged';
  errors: string[];
  warnings: string[];
  changes: BulkChange[];
}

export interface BulkPreviewResult {
  batch_id: string;
  summary: {
    total: number;
    ready: number;
    unchanged: number;
    errors: number;
    warnings: number;
  };
  rows: BulkPreviewRow[];
}

interface PendingBatch {
  created_at: Date;
  created_by: string;
  rows: Array<BulkPreviewRow & { updates?: Record<string, unknown> }>;
}

const BATCH_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class EmployeeBulkService {
  private readonly logger = new Logger(EmployeeBulkService.name);
  private readonly pendingBatches = new Map<string, PendingBatch>();

  constructor(private readonly prisma: PrismaService) {}

  async exportWorkbook(): Promise<Buffer> {
    const employees = await this.prisma.employee.findMany({
      where: { employment_status: 'active' },
      include: {
        role: true,
        department: true,
        supervisor: { select: { employee_code: true } },
      },
      orderBy: { full_name: 'asc' },
    });

    const rows = employees.map((e) => ({
      [BULK_COLUMNS.id]: e.id,
      [BULK_COLUMNS.employee_code]: e.employee_code,
      [BULK_COLUMNS.full_name]: e.full_name,
      [BULK_COLUMNS.email]: e.email,
      [BULK_COLUMNS.department]: e.department?.name ?? '',
      [BULK_COLUMNS.role]: e.role?.role_name ?? '',
      [BULK_COLUMNS.whatsapp_number]: e.whatsapp_number ?? '',
      [BULK_COLUMNS.supervisor_code]: e.supervisor?.employee_code ?? '',
    }));

    const dataSheet = XLSX.utils.json_to_sheet(rows);
    const guideSheet = XLSX.utils.aoa_to_sheet([
      ['Panduan Import / Update Karyawan Massal — TARA'],
      [],
      ['ATURAN PENTING'],
      [
        'Jangan ubah ketiga kolom identitas sekaligus: Nomor Pegawai, Nama Pegawai, dan Nomor WhatsApp.',
      ],
      [
        'Minimal satu dari ketiga kolom tersebut harus tetap sama dengan data asli — itu dipakai sebagai anchor pencocokan baris.',
      ],
      ['Kolom ID Sistem wajib ada dan tidak boleh dihapus.'],
      [],
      ['KOLOM YANG BISA DIUBAH'],
      ['Email, Departemen, Role, Nomor WhatsApp, Atasan (Nomor Pegawai), serta maksimal 2 dari 3 kolom identitas di atas.'],
      [],
      ['FORMAT'],
      ['Email: format email valid (contoh: nama@perusahaan.com)'],
      ['Nomor WhatsApp: angka internasional tanpa + (contoh: 6281234567890), boleh dikosongkan'],
      ['Nomor Pegawai: 2–50 karakter (huruf, angka, underscore, tanda hubung)'],
      ['Atasan: isi Nomor Pegawai atasan, atau kosongkan untuk menghapus atasan'],
      [],
      ['ALUR KERJA'],
      ['1. Download file ini', '2. Edit di Excel', '3. Upload kembali', '4. Review perubahan', '5. Approve untuk simpan'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, dataSheet, BULK_SHEET_NAME);
    XLSX.utils.book_append_sheet(workbook, guideSheet, BULK_GUIDE_SHEET);

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async previewUpload(file: Express.Multer.File, userId: string): Promise<BulkPreviewResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File Excel wajib diupload');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('File tidak valid atau bukan format Excel (.xlsx)');
    }

    const sheet = workbook.Sheets[BULK_SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      throw new BadRequestException(`Sheet "${BULK_SHEET_NAME}" tidak ditemukan`);
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (rawRows.length === 0) {
      throw new BadRequestException('File tidak berisi data karyawan');
    }
    if (rawRows.length > 500) {
      throw new BadRequestException('Maksimal 500 baris per upload');
    }

    const employees = await this.prisma.employee.findMany({
      where: { employment_status: 'active' },
      include: {
        role: true,
        department: true,
        supervisor: { select: { employee_code: true } },
      },
    });

    const byId = new Map(employees.map((e) => [e.id, e]));
    const byCode = new Map(employees.map((e) => [e.employee_code.toUpperCase(), e]));
    const roles = await this.prisma.role.findMany();
    const roleByName = new Map(roles.map((r) => [r.role_name.toLowerCase(), r]));

    const emailUsage = new Map<string, number[]>();
    const codeUsage = new Map<string, number[]>();
    const waUsage = new Map<string, number[]>();

    const parsedRows: Array<BulkPreviewRow & { updates?: Record<string, unknown> }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2;
      const raw = rawRows[i];
      const parsed = this.parseRow(raw);
      const result = await this.validateRow(
        rowNumber,
        parsed,
        byId,
        byCode,
        roleByName,
        emailUsage,
        codeUsage,
        waUsage,
      );
      parsedRows.push(result);
    }

    // Second pass: duplicate detection within file
    for (const [email, rowNums] of emailUsage) {
      if (rowNums.length <= 1) continue;
      for (const rn of rowNums) {
        const row = parsedRows.find((r) => r.row_number === rn);
        if (row) {
          row.errors.push(`Email duplikat dalam file (baris ${rowNums.join(', ')})`);
          row.status = 'error';
        }
      }
    }
    for (const [code, rowNums] of codeUsage) {
      if (rowNums.length <= 1) continue;
      for (const rn of rowNums) {
        const row = parsedRows.find((r) => r.row_number === rn);
        if (row) {
          row.errors.push(`Nomor Pegawai duplikat dalam file (baris ${rowNums.join(', ')})`);
          row.status = 'error';
        }
      }
    }
    for (const [wa, rowNums] of waUsage) {
      if (rowNums.length <= 1 || !wa) continue;
      for (const rn of rowNums) {
        const row = parsedRows.find((r) => r.row_number === rn);
        if (row) {
          row.errors.push(`Nomor WhatsApp duplikat dalam file (baris ${rowNums.join(', ')})`);
          row.status = 'error';
        }
      }
    }

    const batchId = randomUUID();
    this.pendingBatches.set(batchId, {
      created_at: new Date(),
      created_by: userId,
      rows: parsedRows,
    });
    this.pruneBatches();

    const summary = {
      total: parsedRows.length,
      ready: parsedRows.filter((r) => r.status === 'ok').length,
      unchanged: parsedRows.filter((r) => r.status === 'unchanged').length,
      errors: parsedRows.filter((r) => r.status === 'error').length,
      warnings: parsedRows.filter((r) => r.status === 'warning').length,
    };

    return {
      batch_id: batchId,
      summary,
      rows: parsedRows.map(({ updates: _u, ...row }) => row),
    };
  }

  async applyBatch(batchId: string, userId: string) {
    this.pruneBatches();
    const batch = this.pendingBatches.get(batchId);
    if (!batch) {
      throw new NotFoundException('Sesi preview tidak ditemukan atau sudah kedaluwarsa. Upload ulang file.');
    }
    if (batch.created_by !== userId) {
      throw new BadRequestException('Sesi preview ini dibuat oleh user lain');
    }

    const applicable = batch.rows.filter((r) => r.status === 'ok' || r.status === 'warning');
    if (applicable.length === 0) {
      throw new BadRequestException('Tidak ada baris yang siap diupdate');
    }

    let updated = 0;
    const failed: Array<{ row_number: number; message: string }> = [];

    await this.prisma.$transaction(async (tx) => {
      for (const row of applicable) {
        if (!row.employee_id || !row.updates || Object.keys(row.updates).length === 0) continue;
        try {
          const data: Record<string, unknown> = { ...row.updates };
          if ('department_name' in data) {
            const deptName = data.department_name as string | null;
            delete data.department_name;
            if (!deptName) {
              data.department_id = null;
            } else {
              let dept = await tx.department.findFirst({
                where: { name: deptName },
                select: { id: true },
              });
              if (!dept) {
                dept = await tx.department.create({
                  data: { name: deptName },
                  select: { id: true },
                });
              }
              data.department_id = dept.id;
            }
          }
          data.updated_at = new Date();
          data.updated_by = userId;
          await tx.employee.update({
            where: { id: row.employee_id },
            data,
          });
          updated++;
        } catch (error: any) {
          failed.push({
            row_number: row.row_number,
            message: error?.message || 'Gagal update',
          });
        }
      }
    });

    this.pendingBatches.delete(batchId);

    return {
      updated,
      skipped: batch.rows.length - applicable.length,
      failed,
    };
  }

  private pruneBatches() {
    const cutoff = Date.now() - BATCH_TTL_MS;
    for (const [id, batch] of this.pendingBatches) {
      if (batch.created_at.getTime() < cutoff) {
        this.pendingBatches.delete(id);
      }
    }
  }

  private parseRow(raw: Record<string, unknown>) {
    const get = (key: BulkField) => String(raw[BULK_COLUMNS[key]] ?? '').trim();
    return {
      id: get('id'),
      employee_code: get('employee_code'),
      full_name: get('full_name'),
      email: get('email').toLowerCase(),
      department: get('department'),
      role: get('role'),
      whatsapp_number: get('whatsapp_number'),
      supervisor_code: get('supervisor_code'),
    };
  }

  private async validateRow(
    rowNumber: number,
    parsed: ReturnType<EmployeeBulkService['parseRow']>,
    byId: Map<string, any>,
    byCode: Map<string, any>,
    roleByName: Map<string, any>,
    emailUsage: Map<string, number[]>,
    codeUsage: Map<string, number[]>,
    waUsage: Map<string, number[]>,
  ): Promise<BulkPreviewRow & { updates?: Record<string, unknown> }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const changes: BulkChange[] = [];

    if (!parsed.id) {
      return {
        row_number: rowNumber,
        employee_id: null,
        employee_code: parsed.employee_code,
        full_name: parsed.full_name,
        status: 'error',
        errors: ['ID Sistem kosong — gunakan file hasil download dari TARA'],
        warnings: [],
        changes: [],
      };
    }

    const existing = byId.get(parsed.id);
    if (!existing) {
      return {
        row_number: rowNumber,
        employee_id: parsed.id,
        employee_code: parsed.employee_code,
        full_name: parsed.full_name,
        status: 'error',
        errors: ['Karyawan tidak ditemukan atau tidak aktif'],
        warnings: [],
        changes: [],
      };
    }

    const dbCode = existing.employee_code;
    const dbName = existing.full_name;
    const dbWa = existing.whatsapp_number ?? '';
    const normWa = parsed.whatsapp_number
      ? normalizeWhatsAppPhone(parsed.whatsapp_number)
      : '';

    const identityChanges = [
      parsed.employee_code && parsed.employee_code.toUpperCase() !== dbCode.toUpperCase(),
      parsed.full_name && parsed.full_name !== dbName,
      normWa !== dbWa,
    ].filter(Boolean).length;

    if (identityChanges >= 3) {
      errors.push(
        'Tidak boleh mengubah Nomor Pegawai, Nama Pegawai, dan Nomor WhatsApp sekaligus. Minimal satu harus tetap sebagai anchor.',
      );
    }

    const anchorsKept = [
      !parsed.employee_code || parsed.employee_code.toUpperCase() === dbCode.toUpperCase(),
      !parsed.full_name || parsed.full_name === dbName,
      !parsed.whatsapp_number || normWa === dbWa,
    ].filter(Boolean).length;

    if (identityChanges > 0 && anchorsKept === 0) {
      errors.push('Tidak ada anchor identitas yang cocok dengan data asli');
    }

    // employee_code
    let newCode = dbCode;
    if (parsed.employee_code && parsed.employee_code.toUpperCase() !== dbCode.toUpperCase()) {
      newCode = parsed.employee_code.toUpperCase();
      if (!/^[\w-]{2,50}$/.test(newCode)) {
        errors.push('Format Nomor Pegawai tidak valid (2–50 karakter)');
      } else {
        const taken = await this.prisma.employee.findFirst({
          where: { employee_code: newCode, id: { not: existing.id } },
          select: { full_name: true },
        });
        if (taken) errors.push(`Nomor Pegawai sudah dipakai oleh ${taken.full_name}`);
        else {
          changes.push({
            field: 'employee_code',
            label: 'Nomor Pegawai',
            old_value: dbCode,
            new_value: newCode,
          });
        }
      }
      const list = codeUsage.get(newCode) ?? [];
      list.push(rowNumber);
      codeUsage.set(newCode, list);
    }

    // full_name
    let newName = dbName;
    if (parsed.full_name && parsed.full_name !== dbName) {
      newName = parsed.full_name;
      changes.push({
        field: 'full_name',
        label: 'Nama Pegawai',
        old_value: dbName,
        new_value: newName,
      });
    }

    // email
    let newEmail = existing.email;
    if (parsed.email && parsed.email !== existing.email.toLowerCase()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email)) {
        errors.push('Format email tidak valid');
      } else {
        const taken = await this.prisma.employee.findFirst({
          where: { email: parsed.email, id: { not: existing.id } },
          select: { full_name: true, employment_status: true },
        });
        if (taken) {
          errors.push(
            taken.employment_status === 'deleted'
              ? `Email dipakai karyawan yang dihapus (${taken.full_name})`
              : `Email sudah dipakai oleh ${taken.full_name}`,
          );
        } else {
          newEmail = parsed.email;
          changes.push({
            field: 'email',
            label: 'Email',
            old_value: existing.email,
            new_value: newEmail,
          });
          const list = emailUsage.get(parsed.email) ?? [];
          list.push(rowNumber);
          emailUsage.set(parsed.email, list);
        }
      }
    } else if (parsed.email) {
      const list = emailUsage.get(parsed.email) ?? [];
      list.push(rowNumber);
      emailUsage.set(parsed.email, list);
    }

    // whatsapp
    let newWa: string | null = dbWa || null;
    if (parsed.whatsapp_number !== (existing.whatsapp_number ?? '')) {
      if (!normWa) {
        newWa = null;
        changes.push({
          field: 'whatsapp_number',
          label: 'Nomor WhatsApp',
          old_value: dbWa,
          new_value: '',
        });
      } else if (!/^\d{10,15}$/.test(normWa)) {
        errors.push('Format Nomor WhatsApp tidak valid (10–15 digit, contoh: 6281234567890)');
      } else {
        const taken = await this.prisma.employee.findFirst({
          where: { whatsapp_number: normWa, id: { not: existing.id } },
          select: { full_name: true },
        });
        if (taken) errors.push(`Nomor WhatsApp sudah dipakai oleh ${taken.full_name}`);
        else {
          newWa = normWa;
          changes.push({
            field: 'whatsapp_number',
            label: 'Nomor WhatsApp',
            old_value: dbWa,
            new_value: normWa,
          });
          const list = waUsage.get(normWa) ?? [];
          list.push(rowNumber);
          waUsage.set(normWa, list);
        }
      }
    } else if (normWa) {
      const list = waUsage.get(normWa) ?? [];
      list.push(rowNumber);
      waUsage.set(normWa, list);
    }

    // department
    let departmentId = existing.department_id;
    const dbDept = existing.department?.name ?? '';
    if (parsed.department !== dbDept) {
      if (!parsed.department) {
        departmentId = null;
        changes.push({ field: 'department', label: 'Departemen', old_value: dbDept, new_value: '' });
      } else {
        const dept = await this.prisma.department.findFirst({
          where: { name: parsed.department },
          select: { id: true },
        });
        if (!dept) {
          warnings.push(`Departemen baru akan dibuat: ${parsed.department}`);
        }
        departmentId = dept?.id ?? null;
        changes.push({
          field: 'department',
          label: 'Departemen',
          old_value: dbDept,
          new_value: parsed.department,
        });
      }
    }

    // role
    let roleId = existing.role_id;
    const dbRole = existing.role?.role_name ?? '';
    if (parsed.role !== dbRole) {
      if (!parsed.role) {
        roleId = null;
        changes.push({ field: 'role', label: 'Role', old_value: dbRole, new_value: '' });
      } else {
        const role = roleByName.get(parsed.role.toLowerCase());
        if (!role) {
          errors.push(`Role "${parsed.role}" tidak ditemukan di sistem`);
        } else {
          roleId = role.id;
          changes.push({
            field: 'role',
            label: 'Role',
            old_value: dbRole,
            new_value: parsed.role,
          });
        }
      }
    }

    // supervisor
    let supervisorId = existing.supervisor_id;
    const dbSup = existing.supervisor?.employee_code ?? '';
    if (parsed.supervisor_code.toUpperCase() !== dbSup.toUpperCase()) {
      if (!parsed.supervisor_code) {
        supervisorId = null;
        changes.push({ field: 'supervisor', label: 'Atasan', old_value: dbSup, new_value: '' });
      } else {
        const sup = byCode.get(parsed.supervisor_code.toUpperCase());
        if (!sup) {
          errors.push(`Atasan dengan Nomor Pegawai "${parsed.supervisor_code}" tidak ditemukan`);
        } else if (sup.id === existing.id) {
          errors.push('Karyawan tidak bisa menjadi atasan dirinya sendiri');
        } else {
          supervisorId = sup.id;
          changes.push({
            field: 'supervisor',
            label: 'Atasan',
            old_value: dbSup,
            new_value: parsed.supervisor_code,
          });
        }
      }
    }

    const updates: Record<string, unknown> = {};
    if (changes.some((c) => c.field === 'employee_code')) updates.employee_code = newCode;
    if (changes.some((c) => c.field === 'full_name')) updates.full_name = newName;
    if (changes.some((c) => c.field === 'email')) updates.email = newEmail;
    if (changes.some((c) => c.field === 'whatsapp_number')) {
      updates.whatsapp_number = newWa;
      updates.whatsapp_verified = !!newWa;
      updates.whatsapp_opted_in = !!newWa;
      updates.whatsapp_verified_at = newWa ? new Date() : null;
      updates.phone = newWa || existing.phone;
    }
    if (changes.some((c) => c.field === 'department')) {
      updates.department_name = parsed.department || null;
    }
    if (changes.some((c) => c.field === 'role')) updates.role_id = roleId;
    if (changes.some((c) => c.field === 'supervisor')) updates.supervisor_id = supervisorId;

    let status: BulkPreviewRow['status'] = 'unchanged';
    if (errors.length > 0) status = 'error';
    else if (changes.length === 0) status = 'unchanged';
    else if (warnings.length > 0) status = 'warning';
    else status = 'ok';

    return {
      row_number: rowNumber,
      employee_id: existing.id,
      employee_code: parsed.employee_code || dbCode,
      full_name: parsed.full_name || dbName,
      status,
      errors,
      warnings,
      changes,
      updates: status === 'error' || status === 'unchanged' ? undefined : updates,
    };
  }
}
