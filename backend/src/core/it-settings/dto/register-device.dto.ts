import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from "class-validator";

export enum DeviceType {
  POS = "pos",
  BIOMETRIC = "biometric",
  PRINTER = "printer",
  SCANNER = "scanner",
  TERMINAL = "terminal",
}

export class RegisterDeviceDto {
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @IsString()
  @IsNotEmpty()
  location_id: string;

  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsString()
  @IsOptional()
  macAddress?: string;
}
