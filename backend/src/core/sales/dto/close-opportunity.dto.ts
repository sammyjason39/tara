import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CloseOpportunityDto {
  @IsString()
  @IsNotEmpty()
  result: 'won' | 'lost';

  @IsString()
  @IsOptional()
  quoteId?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  actorId?: string;
}
