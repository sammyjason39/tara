import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(["lead_generation", "awareness", "nurture", "remarketing"])
  objective: "lead_generation" | "awareness" | "nurture" | "remarketing";

  @IsArray()
  channel_mix: Array<
    | "meta_ads"
    | "google_ads"
    | "email"
    | "whatsapp"
    | "webinar"
    | "landing_page"
    | "event"
  >;

  @IsNumber()
  @Min(0)
  budget: number;

  @IsString()
  @IsOptional()
  currency?: "IDR" | "USD";

  @IsString()
  @IsNotEmpty()
  start_date: string;

  @IsString()
  @IsNotEmpty()
  end_date: string;

  @IsString()
  @IsNotEmpty()
  audience: string;
}
