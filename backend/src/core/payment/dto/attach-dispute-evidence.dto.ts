import { IsNotEmpty, IsString } from 'class-validator';

export class AttachDisputeEvidenceDto {
  @IsString()
  @IsNotEmpty()
  evidence: string;
}

