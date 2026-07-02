import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';

export const FEATURE_KEYS = [
  'dashboard',
  'employees',
  'attendance',
  'leave',
  'payroll',
  'loans',
  'schedule',
  'sop',
  'notifications',
  'ai_assistant',
  'ai_logs',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  group: 'core' | 'hr' | 'finance' | 'advanced';
}

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Ringkasan statistik dan aktivitas harian',
    group: 'core',
  },
  {
    key: 'employees',
    label: 'Karyawan',
    description: 'Manajemen data karyawan dan profil',
    group: 'core',
  },
  {
    key: 'attendance',
    label: 'Kehadiran',
    description: 'Absensi, clock in/out, dan laporan kehadiran',
    group: 'hr',
  },
  {
    key: 'leave',
    label: 'Cuti',
    description: 'Pengajuan cuti, saldo, dan persetujuan',
    group: 'hr',
  },
  {
    key: 'payroll',
    label: 'Penggajian',
    description: 'Periode gaji, komponen, dan slip gaji',
    group: 'finance',
  },
  {
    key: 'loans',
    label: 'Pinjaman / Kasbon',
    description: 'Pinjaman karyawan dan potongan gaji',
    group: 'finance',
  },
  {
    key: 'schedule',
    label: 'Jadwal Kerja',
    description: 'Penjadwalan shift dan template kerja',
    group: 'hr',
  },
  {
    key: 'sop',
    label: 'SOP & Dokumen',
    description: 'Standard operating procedure dan basis pengetahuan',
    group: 'advanced',
  },
  {
    key: 'notifications',
    label: 'Notifikasi',
    description: 'Pusat notifikasi dan pemberitahuan sistem',
    group: 'core',
  },
  {
    key: 'ai_assistant',
    label: 'AI Assistant',
    description: 'Asisten AI via WhatsApp dan konfigurasi agen',
    group: 'advanced',
  },
  {
    key: 'ai_logs',
    label: 'Log AI',
    description: 'Riwayat percakapan dan aktivitas AI',
    group: 'advanced',
  },
];

const SETTING_KEY = 'company.enabled_modules';

/** All modules enabled by default — existing deployments stay unchanged. */
export const DEFAULT_ENABLED_MODULES: Record<FeatureKey, boolean> =
  Object.fromEntries(FEATURE_KEYS.map((k) => [k, true])) as Record<
    FeatureKey,
    boolean
  >;

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  mergeWithDefaults(raw: unknown): Record<FeatureKey, boolean> {
    const merged = { ...DEFAULT_ENABLED_MODULES };
    if (!raw || typeof raw !== 'object') return merged;

    for (const key of FEATURE_KEYS) {
      const val = (raw as Record<string, unknown>)[key];
      if (typeof val === 'boolean') merged[key] = val;
    }
    return merged;
  }

  async getEnabledModules(): Promise<Record<FeatureKey, boolean>> {
    const row = await this.prisma.systemSettings.findUnique({
      where: { setting_key: SETTING_KEY },
    });
    return this.mergeWithDefaults(row?.setting_value);
  }

  async isEnabled(feature: FeatureKey): Promise<boolean> {
    const modules = await this.getEnabledModules();
    return modules[feature] ?? true;
  }

  async getPublicFeatures() {
    const modules = await this.getEnabledModules();
    return {
      modules,
      definitions: FEATURE_DEFINITIONS,
    };
  }

  async getAdminSettings() {
    const modules = await this.getEnabledModules();
    return {
      modules,
      definitions: FEATURE_DEFINITIONS,
      defaults: DEFAULT_ENABLED_MODULES,
    };
  }

  validateModules(input: unknown): Record<FeatureKey, boolean> {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Payload modules tidak valid');
    }

    const current = { ...DEFAULT_ENABLED_MODULES };
    const body = input as Record<string, unknown>;

    for (const key of FEATURE_KEYS) {
      if (body[key] === undefined) continue;
      if (typeof body[key] !== 'boolean') {
        throw new BadRequestException(`Nilai fitur "${key}" harus boolean`);
      }
      current[key] = body[key];
    }

    return current;
  }

  async saveModules(
    modules: Record<FeatureKey, boolean>,
    modifiedBy?: string,
  ): Promise<Record<FeatureKey, boolean>> {
    await this.prisma.systemSettings.upsert({
      where: { setting_key: SETTING_KEY },
      update: {
        setting_value: modules as any,
        last_modified_by: modifiedBy ?? null,
        updated_at: new Date(),
      },
      create: {
        setting_key: SETTING_KEY,
        setting_value: modules as any,
        setting_category: 'company',
        description: 'Enabled product modules per company',
        last_modified_by: modifiedBy ?? null,
      },
    });
    return modules;
  }
}
