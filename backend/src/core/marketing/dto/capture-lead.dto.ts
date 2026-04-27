import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CaptureLeadDto {
  @IsString()
  @IsIn([
    "landing_page",
    "embedded_form",
    "chatbot",
    "webinar",
    "meta_lead_ads",
    "google_ads",
    "partner_api",
  ])
  source:
    | "landing_page"
    | "embedded_form"
    | "chatbot"
    | "webinar"
    | "meta_lead_ads"
    | "google_ads"
    | "partner_api";

  @IsString()
  @IsNotEmpty()
  company_name: string;

  @IsString()
  @IsNotEmpty()
  contact_name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  employeeBand?: string;

  @IsString()
  @IsOptional()
  branch_id?: string;

  @IsString()
  @IsOptional()
  ecommerce_id?: string;
}
