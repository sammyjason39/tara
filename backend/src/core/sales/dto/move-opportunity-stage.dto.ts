import { IsNotEmpty, IsString } from 'class-validator';

export class MoveOpportunityStageDto {
  @IsString()
  @IsNotEmpty()
  stage:
    | 'new'
    | 'contacted'
    | 'qualified'
    | 'proposal'
    | 'negotiation'
    | 'closed_won'
    | 'closed_lost';
}
