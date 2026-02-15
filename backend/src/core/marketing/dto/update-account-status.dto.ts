import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateAccountStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['connected', 'expired', 'disconnected'])
  status: 'connected' | 'expired' | 'disconnected';
}

