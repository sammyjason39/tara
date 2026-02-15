import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOpportunityDto {
  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: 'IDR' | 'USD';

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsOptional()
  nextAction?: string;
}
