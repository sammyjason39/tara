import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class RunExecutionDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  leadsGenerated?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  spend?: number;

  @IsBoolean()
  @IsOptional()
  failed?: boolean;
}

