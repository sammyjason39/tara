import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRequisitionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  requesterDept: string;

  @IsString()
  @IsNotEmpty()
  branchCode: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: 'IDR' | 'USD';

  @IsString()
  @IsOptional()
  createdBy?: string;
}

