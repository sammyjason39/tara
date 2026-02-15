import { IsIn, IsString } from 'class-validator';

export class UpdateProviderStatusDto {
  @IsString()
  @IsIn(['healthy', 'degraded', 'down'])
  status: 'healthy' | 'degraded' | 'down';
}

