import { IsBoolean, IsOptional } from 'class-validator';

export class ExecutePaymentDto {
  @IsBoolean()
  @IsOptional()
  forceFail?: boolean;
}

