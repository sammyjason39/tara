import { IsString, IsNotEmpty, IsDateString } from "class-validator";

export class CreatePerformanceCycleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsDateString()
  dueDate: string;
}
