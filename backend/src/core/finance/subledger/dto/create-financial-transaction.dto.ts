import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFinancialTransactionDto {
  @IsNotEmpty()
  @IsString()
  location_id: string;

  @IsNotEmpty()
  @IsString()
  skuId: string;

  @IsNotEmpty()
  @IsEnum(['RECEIPT', 'ISSUE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'])
  type: 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';

  @IsNotEmpty()
  @IsNumber()
  qty: number;

  @IsNotEmpty()
  @IsString()
  uom: string;

  @IsNotEmpty()
  @IsString()
  sourceId: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value?.toString())
  provisionalCost?: number;

  @IsOptional()
  @IsString()
  reservationId?: string;
}
