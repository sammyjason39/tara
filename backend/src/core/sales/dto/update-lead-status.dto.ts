import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateLeadStatusDto {
  @IsString()
  @IsNotEmpty()
  status:
    | 'new'
    | 'assigned'
    | 'contacted'
    | 'qualified'
    | 'disqualified'
    | 'converted';
}
