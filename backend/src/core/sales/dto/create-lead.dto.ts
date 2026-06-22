import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  MaxLength,
} from "class-validator";

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'company_name must be at least 2 characters' })
  @MaxLength(200, { message: 'company_name must be at most 200 characters' })
  company_name: string;

  @IsString()
  @IsNotEmpty({ message: 'contact_name is required' })
  contact_name: string;

  @IsEmail()
  @IsOptional()
  contact_email?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  source?: "marketing" | "referral" | "inbound" | "outbound" | "partner";

  @IsNumber()
  @Min(0)
  potential_value: number;

  @IsString()
  @IsOptional()
  currency?: "IDR" | "USD";

  @IsString()
  @IsOptional()
  priority?: "low" | "medium" | "high" | "urgent";
}
