import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ScheduleExecutionDto {
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @IsString()
  @IsIn([
    "meta_ads",
    "google_ads",
    "email",
    "whatsapp",
    "webinar",
    "landing_page",
    "event",
  ])
  channel:
    | "meta_ads"
    | "google_ads"
    | "email"
    | "whatsapp"
    | "webinar"
    | "landing_page"
    | "event";

  @IsString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  branch_id?: string;

  @IsString()
  @IsOptional()
  ecommerce_id?: string;
}
