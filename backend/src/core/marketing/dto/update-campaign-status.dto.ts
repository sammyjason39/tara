import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateCampaignStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['draft', 'scheduled', 'active', 'paused', 'completed', 'failed'])
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'failed';
}

