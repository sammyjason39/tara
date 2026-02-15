import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsString()
  @IsIn(['full', 'partial', 'scheduled'])
  type: 'full' | 'partial' | 'scheduled';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  scheduledAt?: string;
}

