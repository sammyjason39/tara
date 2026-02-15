import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  @IsNotEmpty()
  opportunityId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;

  @IsNumber()
  @IsOptional()
  validDays?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
