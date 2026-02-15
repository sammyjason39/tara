import { IsIn, IsString } from 'class-validator';

export class ResolveDisputeDto {
  @IsString()
  @IsIn(['won', 'lost', 'settled'])
  resolution: 'won' | 'lost' | 'settled';
}

