import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateRequisitionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

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
  currency?: "IDR" | "USD";

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
