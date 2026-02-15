import { IsIn, IsString } from 'class-validator';

export class UpdateDeviceStatusDto {
  @IsString()
  @IsIn(['online', 'offline', 'maintenance'])
  status: 'online' | 'offline' | 'maintenance';
}

