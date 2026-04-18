import { IsString, IsInt, IsOptional, IsNumber, IsEnum } from "class-validator";

export class CreateBudgetScenarioDto {
  @IsString()
  name: string;

  @IsInt()
  fiscal_year: number;

  @IsEnum(["DRAFT", "ACTIVE", "ARCHIVED"])
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  total_budget?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
