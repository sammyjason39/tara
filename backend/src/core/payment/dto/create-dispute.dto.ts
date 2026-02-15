import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

