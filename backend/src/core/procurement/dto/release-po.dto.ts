import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class ReleasePoDto {
  @IsString()
  @IsNotEmpty()
  requisitionId: string;

  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsNumber()
  @Min(0)
  total_amount: number;
}
