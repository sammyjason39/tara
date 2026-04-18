import { IsNumber, IsDateString, IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { FiscalPeriodStatus } from '../domain/finance.constants';

export class CreateFiscalYearDto {
  @IsNumber()
  year: number;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;
}

export class UpdateFiscalPeriodDto {
  @IsEnum(FiscalPeriodStatus)
  status: FiscalPeriodStatus;
}
