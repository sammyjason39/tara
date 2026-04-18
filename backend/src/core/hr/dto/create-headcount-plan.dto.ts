import { IsString, IsInt, IsNumber, IsDateString } from "class-validator";

export class CreateHeadcountPlanDto {
  @IsString()
  scenario_id: string;

  @IsString()
  department_id: string;

  @IsString()
  position_title: string;

  @IsInt()
  target_headcount: number;

  @IsNumber()
  projected_salary: number;

  @IsDateString()
  planned_hire_date: string;
}
