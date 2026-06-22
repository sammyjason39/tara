import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'name must be at least 3 characters' })
  @MaxLength(100, { message: 'name must be at most 100 characters' })
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

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 audience segment is required' })
  @IsString({ each: true })
  audienceSegments?: string[];

  @IsString()
  @IsOptional()
  branch_id?: string;

  @IsString()
  @IsOptional()
  ecommerce_id?: string;
}
