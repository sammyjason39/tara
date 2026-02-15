import { IsIn, IsString } from 'class-validator';

export class ProgressDisputeDto {
  @IsString()
  @IsIn(['opened', 'evidence_attached', 'finance_review', 'provider_submitted', 'resolved', 'rejected'])
  status:
    | 'opened'
    | 'evidence_attached'
    | 'finance_review'
    | 'provider_submitted'
    | 'resolved'
    | 'rejected';
}

