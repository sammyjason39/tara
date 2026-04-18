import { IsString, IsOptional, IsObject, IsEnum, IsBoolean } from "class-validator";

export enum DeviceType {
  RFID_READER = "RFID_READER",
  BARCODE_SCANNER = "BARCODE_SCANNER",
  POS_TERMINAL = "POS_TERMINAL"
}

export enum ConnectionType {
  API = "API",
  LAN = "LAN",
  USB = "USB",
  MQTT = "MQTT"
}

export class CreateDeviceDto {
  @IsString()
  name: string;

  @IsEnum(DeviceType)
  type: string;

  @IsString()
  connection: string;

  @IsOptional()
  @IsString()
  location_id?: string;

  @IsOptional()
  @IsString()
  owner_id?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateDeviceEventDto {
  @IsString()
  device_id: string;

  @IsString()
  event_type: string;

  @IsObject()
  payload: any;

  @IsOptional()
  @IsBoolean()
  processed?: boolean;
}
