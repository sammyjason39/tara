import { IsString, IsNotEmpty } from 'class-validator';

export class EnrollTrainingDto {
  @IsString()
  @IsNotEmpty()
  employee_id: string;

  @IsString()
  @IsNotEmpty()
  programId: string;
}
