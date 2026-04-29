import { IsString, IsOptional } from 'class-validator';

export class TransferEmployeeDto {
  @IsString()
  @IsOptional()
  newLocationId?: string;

  @IsString()
  @IsOptional()
  newDepartmentId?: string;

  @IsString()
  @IsOptional()
  newCompanyId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
