import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../../persistence/prisma.service';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColorSet {
  primary: string;
  background: string;
  accent: string;
}

export interface CompanyBrandingConfig {
  light: ThemeColorSet;
  dark: ThemeColorSet;
  fonts?: FontThemeConfig;
  dark_mode_enabled: boolean;
  /** When dark_mode_enabled is false, force this theme */
  forced_theme: ThemeMode;
  /** Default for new users when dark_mode_enabled is true */
  default_theme: ThemeMode;
}

export interface FontThemeConfig {
  sans: string;
  display: string;
  mono: string;
}

const ALLOWED_FONT_IDS = new Set([
  'inter', 'plus-jakarta', 'dm-sans', 'poppins', 'montserrat', 'nunito', 'lato', 'roboto',
  'open-sans', 'work-sans', 'outfit', 'manrope', 'raleway', 'source-sans',
  'playfair', 'fraunces', 'merriweather', 'libre-baskerville', 'cormorant', 'lora',
  'crimson', 'dm-serif', 'bitter', 'source-serif', 'eb-garamond', 'space-grotesk',
  'jetbrains', 'fira-code', 'roboto-mono', 'ibm-plex-mono', 'source-code', 'inconsolata',
  'dm-mono', 'space-mono',
]);

export const DEFAULT_FONTS: FontThemeConfig = {
  sans: 'inter',
  display: 'plus-jakarta',
  mono: 'jetbrains',
};

export const DEFAULT_BRANDING: CompanyBrandingConfig = {
  light: {
    primary: '#1a2332',
    background: '#faf9f7',
    accent: '#d4a037',
  },
  dark: {
    primary: '#ebe9e6',
    background: '#0f1117',
    accent: '#e0a845',
  },
  fonts: { ...DEFAULT_FONTS },
  dark_mode_enabled: true,
  forced_theme: 'light',
  default_theme: 'light',
};

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

@Injectable()
export class CompanyBrandingService {
  private readonly logger = new Logger(CompanyBrandingService.name);
  private readonly uploadDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadDir =
      process.env.BRANDING_UPLOAD_DIR ||
      path.resolve(process.cwd(), 'uploads', 'branding');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async getCompanySettingsMap(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSettings.findMany({
      where: { setting_key: { startsWith: 'company.' } },
    });
    const settings: Record<string, string> = {};
    for (const row of rows) {
      const val = row.setting_value;
      settings[row.setting_key] =
        typeof val === 'string' ? val : JSON.stringify(val ?? '');
    }
    return settings;
  }

  parseBranding(raw: unknown): CompanyBrandingConfig {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_BRANDING };

    const data = raw as Partial<CompanyBrandingConfig>;
    return {
      light: { ...DEFAULT_BRANDING.light, ...(data.light || {}) },
      dark: { ...DEFAULT_BRANDING.dark, ...(data.dark || {}) },
      fonts: this.parseFonts(data.fonts),
      dark_mode_enabled:
        data.dark_mode_enabled ?? DEFAULT_BRANDING.dark_mode_enabled,
      forced_theme: data.forced_theme === 'dark' ? 'dark' : 'light',
      default_theme: data.default_theme === 'dark' ? 'dark' : 'light',
    };
  }

  private parseFonts(raw?: Partial<FontThemeConfig> | null): FontThemeConfig {
    const pick = (key: keyof FontThemeConfig, fallback: string) => {
      const value = raw?.[key];
      return typeof value === 'string' && ALLOWED_FONT_IDS.has(value) ? value : fallback;
    };
    return {
      sans: pick('sans', DEFAULT_FONTS.sans),
      display: pick('display', DEFAULT_FONTS.display),
      mono: pick('mono', DEFAULT_FONTS.mono),
    };
  }

  validateBranding(branding: CompanyBrandingConfig): void {
    const sets: Array<[string, ThemeColorSet]> = [
      ['light', branding.light],
      ['dark', branding.dark],
    ];
    for (const [label, colors] of sets) {
      for (const [key, value] of Object.entries(colors)) {
        if (!HEX_RE.test(String(value).trim())) {
          throw new BadRequestException(
            `Warna ${label}.${key} tidak valid. Gunakan format hex (#RRGGBB).`,
          );
        }
      }
    }
  }

  async getBrandingRow(): Promise<CompanyBrandingConfig> {
    const row = await this.prisma.systemSettings.findUnique({
      where: { setting_key: 'company.branding' },
    });
    return this.parseBranding(row?.setting_value);
  }

  async saveBranding(
    branding: CompanyBrandingConfig,
    modifiedBy?: string,
  ): Promise<CompanyBrandingConfig> {
    this.validateBranding(branding);
    await this.prisma.systemSettings.upsert({
      where: { setting_key: 'company.branding' },
      update: {
        setting_value: branding as any,
        last_modified_by: modifiedBy ?? null,
        updated_at: new Date(),
      },
      create: {
        setting_key: 'company.branding',
        setting_value: branding as any,
        setting_category: 'company',
        description: 'Company branding colors and theme settings',
        last_modified_by: modifiedBy ?? null,
      },
    });
    return branding;
  }

  async getPublicBranding() {
    const settings = await this.getCompanySettingsMap();
    const branding = await this.getBrandingRow();
    const logoPath = settings['company.logo_path'] || '';
    const logoUpdatedAt = settings['company.logo_updated_at'] || '';

    return {
      company_name: settings['company.name'] || 'TARA',
      legal_name: settings['company.legal_name'] || '',
      logo_url: logoPath ? '/api/public/logo' : null,
      logo_updated_at: logoUpdatedAt || null,
      branding,
    };
  }

  getLogoAbsolutePath(): string | null {
    const logoFile = this.getStoredLogoFilename();
    if (!logoFile) return null;
    const full = path.join(this.uploadDir, logoFile);
    return fs.existsSync(full) ? full : null;
  }

  private getStoredLogoFilename(): string | null {
    // Sync read from a marker file or we query DB — use DB via sync file list
    const files = fs.existsSync(this.uploadDir)
      ? fs.readdirSync(this.uploadDir).filter((f) => f.startsWith('logo.'))
      : [];
    return files[0] || null;
  }

  async getLogoPathFromDb(): Promise<string | null> {
    const row = await this.prisma.systemSettings.findUnique({
      where: { setting_key: 'company.logo_path' },
    });
    const stored = String(row?.setting_value ?? '').trim();
    if (!stored) return null;
    const full = path.join(this.uploadDir, stored);
    return fs.existsSync(full) ? full : null;
  }

  async saveLogo(
    file: Express.Multer.File,
    modifiedBy?: string,
  ): Promise<{ logo_path: string; logo_url: string }> {
    if (!file) {
      throw new BadRequestException('File logo wajib diunggah');
    }

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
    if (!allowed.includes(file.mimetype) && !allowedExt.includes(ext)) {
      throw new BadRequestException('Logo harus berformat PNG, JPG, WEBP, atau SVG');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Logo maksimal 2 MB');
    }

    // Remove old logos
    if (fs.existsSync(this.uploadDir)) {
      for (const f of fs.readdirSync(this.uploadDir)) {
        if (f.startsWith('logo.')) {
          fs.unlinkSync(path.join(this.uploadDir, f));
        }
      }
    } else {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const safeExt = ext && allowedExt.includes(ext) ? ext : '.png';
    const filename = `logo${safeExt}`;
    const dest = path.join(this.uploadDir, filename);
    await fs.promises.writeFile(dest, file.buffer);

    const now = new Date().toISOString();
    await this.prisma.systemSettings.upsert({
      where: { setting_key: 'company.logo_path' },
      update: { setting_value: filename, last_modified_by: modifiedBy ?? null },
      create: {
        setting_key: 'company.logo_path',
        setting_value: filename,
        setting_category: 'company',
        last_modified_by: modifiedBy ?? null,
      },
    });
    await this.prisma.systemSettings.upsert({
      where: { setting_key: 'company.logo_updated_at' },
      update: { setting_value: now, last_modified_by: modifiedBy ?? null },
      create: {
        setting_key: 'company.logo_updated_at',
        setting_value: now,
        setting_category: 'company',
        last_modified_by: modifiedBy ?? null,
      },
    });

    this.logger.log(`Company logo saved: ${filename}`);
    return { logo_path: filename, logo_url: '/api/public/logo' };
  }

  async deleteLogo(modifiedBy?: string): Promise<void> {
    const logoPath = await this.getLogoPathFromDb();
    if (logoPath) {
      await fs.promises.unlink(logoPath).catch(() => undefined);
    }
    await this.prisma.systemSettings.deleteMany({
      where: {
        setting_key: { in: ['company.logo_path', 'company.logo_updated_at'] },
      },
    });
    this.logger.log('Company logo removed');
  }

  async requireLogoPath(): Promise<string> {
    const logoPath = await this.getLogoPathFromDb();
    if (!logoPath) {
      throw new NotFoundException('Logo perusahaan belum diunggah');
    }
    return logoPath;
  }
}
