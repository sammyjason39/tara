import {
  IsString,
  IsOptional,
  IsIn,
  IsUrl,
  IsObject,
  MinLength,
  MaxLength,
} from "class-validator";

// ─────────────────────────────────────────────
// EcommerceConnector DTOs (API-key based)
// ─────────────────────────────────────────────

export const SUPPORTED_PLATFORMS = [
  "bambusilver",
  "shopee",
  "tokopedia",
  "lazada",
  "tiktok_shop",
  "woocommerce",
  "shopify",
  "custom",
] as const;

export type EcommercePlatform = (typeof SUPPORTED_PLATFORMS)[number];

export class CreateEcommerceConnectorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsIn(SUPPORTED_PLATFORMS)
  platform: EcommercePlatform;

  @IsString()
  @MinLength(3)
  domain: string;

  @IsOptional()
  branchIds?: string[];

  @IsString()
  @IsOptional()
  inventoryPoolId?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class UpdateEcommerceConnectorDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsIn(SUPPORTED_PLATFORMS)
  @IsOptional()
  platform?: EcommercePlatform;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  branchIds?: string[];

  @IsString()
  @IsOptional()
  inventoryPoolId?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// RetailChannel DTOs (clientId/secret based)
// ─────────────────────────────────────────────

export const SYNC_FREQUENCIES = [
  "realtime",
  "5min",
  "15min",
  "30min",
  "1h",
  "6h",
  "24h",
] as const;
export type SyncFrequency = (typeof SYNC_FREQUENCIES)[number];

export const CHANNEL_ADAPTER_TYPES = [
  "BAMBUSILVER",
  "SHOPEE",
  "TOKOPEDIA",
  "LAZADA",
  "TIKTOK",
  "WOOCOMMERCE",
  "SHOPIFY",
  "CUSTOM",
] as const;
export type ChannelAdapterType = (typeof CHANNEL_ADAPTER_TYPES)[number];

export const INTEGRATION_CATEGORIES = [
  "HEADLESS",
  "PREMADE",
  "PRESET",
] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export class CreateRetailChannelDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsString()
  type: string; // e.g. 'ecommerce', 'marketplace', 'social'

  @IsIn(CHANNEL_ADAPTER_TYPES)
  @IsOptional()
  adapterType?: ChannelAdapterType;

  @IsIn(SYNC_FREQUENCIES)
  @IsOptional()
  syncFrequency?: SyncFrequency;

  @IsUrl({}, { message: "webhookUrl must be a valid URL" })
  @IsOptional()
  webhookUrl?: string;

  @IsString()
  @IsOptional()
  @IsIn(INTEGRATION_CATEGORIES)
  integrationCategory?: IntegrationCategory;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>; // stored inside credentials JSON

  @IsOptional()
  branchIds?: string[];
}

export class UpdateRetailChannelDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsIn(CHANNEL_ADAPTER_TYPES)
  @IsOptional()
  adapterType?: ChannelAdapterType;

  @IsIn(SYNC_FREQUENCIES)
  @IsOptional()
  syncFrequency?: SyncFrequency;

  @IsUrl({}, { message: "webhookUrl must be a valid URL" })
  @IsOptional()
  webhookUrl?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  @IsIn(INTEGRATION_CATEGORIES)
  integrationCategory?: IntegrationCategory;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;

  @IsOptional()
  branchIds?: string[];
}
