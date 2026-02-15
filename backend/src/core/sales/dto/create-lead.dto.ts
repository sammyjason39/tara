import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  source?: 'marketing' | 'referral' | 'inbound' | 'outbound' | 'partner';

  @IsNumber()
  @Min(0)
  potentialValue: number;

  @IsString()
  @IsOptional()
  currency?: 'IDR' | 'USD';

  @IsString()
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}
