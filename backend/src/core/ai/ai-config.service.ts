import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import {
  DEFAULT_AI_CONFIG,
  DEFAULT_WHATSAPP_CONFIG,
  TaraAiConfig,
  TaraWhatsAppConfig,
} from './ai.interfaces';

const AI_KEYS = {
  enabled: 'ai.enabled',
  provider: 'ai.provider',
  apiKey: 'ai.api_key',
  baseUrl: 'ai.base_url',
  model: 'ai.model',
  maxTokens: 'ai.max_tokens',
  temperature: 'ai.temperature',
  responseLanguage: 'ai.response_language',
  confirmationTimeoutMinutes: 'ai.confirmation_timeout_minutes',
  systemPromptOverride: 'ai.system_prompt_override',
} as const;

const WA_KEYS = {
  enabled: 'whatsapp.ai_enabled',
  kapsoApiKey: 'whatsapp.kapso_api_key',
  phoneNumberId: 'whatsapp.phone_number_id',
  businessNumber: 'whatsapp.business_number',
  webhookVerifyToken: 'whatsapp.webhook_verify_token',
} as const;

@Injectable()
export class AiConfigService implements OnModuleInit {
  private readonly logger = new Logger(AiConfigService.name);
  private aiCache: TaraAiConfig = { ...DEFAULT_AI_CONFIG };
  private waCache: TaraWhatsAppConfig = { ...DEFAULT_WHATSAPP_CONFIG };

  constructor(private readonly settingsService: SettingsService) {}

  async onModuleInit() {
    await this.refreshCache();
    this.applyWhatsAppEnv();
  }

  async refreshCache(): Promise<void> {
    this.aiCache = await this.loadAiConfig();
    this.waCache = await this.loadWhatsAppConfig();
  }

  getAiConfig(): TaraAiConfig {
    return { ...this.aiCache };
  }

  getWhatsAppConfig(): TaraWhatsAppConfig {
    return { ...this.waCache };
  }

  isAiEnabled(): boolean {
    return this.aiCache.enabled && !!this.aiCache.apiKey;
  }

  async updateAiConfig(dto: Partial<TaraAiConfig & { apiKey?: string }>, modifiedBy?: string): Promise<TaraAiConfig> {
    const current = await this.loadAiConfig();
    const next: TaraAiConfig = {
      ...current,
      ...dto,
      apiKey:
        dto.apiKey && dto.apiKey.length > 0 && !dto.apiKey.includes('•')
          ? dto.apiKey
          : current.apiKey,
    };

    await Promise.all([
      this.settingsService.upsert(AI_KEYS.enabled, next.enabled, 'ai', modifiedBy),
      this.settingsService.upsert(AI_KEYS.provider, next.provider, 'ai', modifiedBy),
      this.settingsService.upsert(AI_KEYS.apiKey, next.apiKey, 'ai', modifiedBy),
      this.settingsService.upsert(AI_KEYS.baseUrl, next.baseUrl, 'ai', modifiedBy),
      this.settingsService.upsert(AI_KEYS.model, next.model, 'ai', modifiedBy),
      this.settingsService.upsert(AI_KEYS.maxTokens, next.maxTokens, 'ai', modifiedBy),
      this.settingsService.upsert(AI_KEYS.temperature, next.temperature, 'ai', modifiedBy),
      this.settingsService.upsert(AI_KEYS.responseLanguage, next.responseLanguage, 'ai', modifiedBy),
      this.settingsService.upsert(
        AI_KEYS.confirmationTimeoutMinutes,
        next.confirmationTimeoutMinutes,
        'ai',
        modifiedBy,
      ),
      this.settingsService.upsert(
        AI_KEYS.systemPromptOverride,
        next.systemPromptOverride || '',
        'ai',
        modifiedBy,
      ),
    ]);

    this.aiCache = next;
    return this.getAiConfigForApi();
  }

  async updateWhatsAppConfig(
    dto: Partial<TaraWhatsAppConfig & { kapsoApiKey?: string }>,
    modifiedBy?: string,
  ): Promise<TaraWhatsAppConfig> {
    const current = await this.loadWhatsAppConfig();
    const next: TaraWhatsAppConfig = {
      ...current,
      ...dto,
      kapsoApiKey:
        dto.kapsoApiKey && dto.kapsoApiKey.length > 0 && !dto.kapsoApiKey.includes('•')
          ? dto.kapsoApiKey
          : current.kapsoApiKey,
    };

    await Promise.all([
      this.settingsService.upsert(WA_KEYS.enabled, next.enabled, 'whatsapp', modifiedBy),
      this.settingsService.upsert(WA_KEYS.kapsoApiKey, next.kapsoApiKey, 'whatsapp', modifiedBy),
      this.settingsService.upsert(WA_KEYS.phoneNumberId, next.phoneNumberId, 'whatsapp', modifiedBy),
      this.settingsService.upsert(WA_KEYS.businessNumber, next.businessNumber, 'whatsapp', modifiedBy),
      this.settingsService.upsert(
        WA_KEYS.webhookVerifyToken,
        next.webhookVerifyToken,
        'whatsapp',
        modifiedBy,
      ),
    ]);

    this.waCache = next;
    this.applyWhatsAppEnv();
    return this.getWhatsAppConfigForApi();
  }

  /** Mask API key for admin UI */
  getAiConfigForApi(): TaraAiConfig {
    const c = this.getAiConfig();
    return {
      ...c,
      apiKey: c.apiKey ? `${c.apiKey.slice(0, 8)}${'•'.repeat(Math.min(24, c.apiKey.length - 8))}` : '',
      apiKeySet: !!this.aiCache.apiKey,
    } as TaraAiConfig & { apiKeySet: boolean };
  }

  getWhatsAppConfigForApi(): TaraWhatsAppConfig {
    const c = this.getWhatsAppConfig();
    return {
      ...c,
      kapsoApiKey: c.kapsoApiKey
        ? `${c.kapsoApiKey.slice(0, 6)}${'•'.repeat(12)}`
        : '',
      kapsoApiKeySet: !!this.waCache.kapsoApiKey,
    } as TaraWhatsAppConfig & { kapsoApiKeySet: boolean };
  }

  getRawApiKey(): string {
    return this.aiCache.apiKey;
  }

  getRawKapsoApiKey(): string {
    return this.waCache.kapsoApiKey || process.env.KAPSO_API_KEY || '';
  }

  private applyWhatsAppEnv(): void {
    if (this.waCache.kapsoApiKey) {
      process.env.KAPSO_API_KEY = this.waCache.kapsoApiKey;
    }
    if (this.waCache.phoneNumberId) {
      process.env.KAPSO_PHONE_NUMBER_ID = this.waCache.phoneNumberId;
    }
  }

  private async loadAiConfig(): Promise<TaraAiConfig> {
    const rows = await this.settingsService.getByCategory('ai');
    const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));

    return {
      enabled: map[AI_KEYS.enabled] === true || map[AI_KEYS.enabled] === 'true',
      provider: String(map[AI_KEYS.provider] || DEFAULT_AI_CONFIG.provider),
      apiKey: String(map[AI_KEYS.apiKey] || process.env.AI_API_KEY || ''),
      baseUrl: String(map[AI_KEYS.baseUrl] || process.env.AI_BASE_URL || DEFAULT_AI_CONFIG.baseUrl),
      model: String(map[AI_KEYS.model] || process.env.AI_MODEL || DEFAULT_AI_CONFIG.model),
      maxTokens: Number(map[AI_KEYS.maxTokens] || DEFAULT_AI_CONFIG.maxTokens),
      temperature: Number(map[AI_KEYS.temperature] ?? DEFAULT_AI_CONFIG.temperature),
      responseLanguage: String(map[AI_KEYS.responseLanguage] || DEFAULT_AI_CONFIG.responseLanguage),
      confirmationTimeoutMinutes: Number(
        map[AI_KEYS.confirmationTimeoutMinutes] || DEFAULT_AI_CONFIG.confirmationTimeoutMinutes,
      ),
      systemPromptOverride: map[AI_KEYS.systemPromptOverride]
        ? String(map[AI_KEYS.systemPromptOverride])
        : undefined,
    };
  }

  private async loadWhatsAppConfig(): Promise<TaraWhatsAppConfig> {
    const rows = await this.settingsService.getByCategory('whatsapp');
    const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));

    return {
      enabled: map[WA_KEYS.enabled] === true || map[WA_KEYS.enabled] === 'true',
      kapsoApiKey: String(map[WA_KEYS.kapsoApiKey] || process.env.KAPSO_API_KEY || ''),
      phoneNumberId: String(
        map[WA_KEYS.phoneNumberId] || process.env.KAPSO_PHONE_NUMBER_ID || '',
      ),
      businessNumber: String(map[WA_KEYS.businessNumber] || ''),
      webhookVerifyToken: String(map[WA_KEYS.webhookVerifyToken] || ''),
    };
  }
}
