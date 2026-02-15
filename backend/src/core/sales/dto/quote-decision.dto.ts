import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QuoteDecisionDto {
  @IsBoolean()
  approved: boolean;

  @IsString()
  @IsOptional()
  decidedBy?: string;
}
