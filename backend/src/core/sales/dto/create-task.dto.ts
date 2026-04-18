import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTaskDto {
  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsString()
  @IsOptional()
  lead_id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  owner_id?: string;

  @IsString()
  @IsOptional()
  owner_name?: string;

  @IsString()
  @IsNotEmpty()
  dueAt: string;

  @IsString()
  @IsOptional()
  priority?: "low" | "medium" | "high" | "urgent";
}
