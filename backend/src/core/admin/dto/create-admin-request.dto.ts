import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum AdminRequestType {
  ACCESS = 'access',
  MODULE_TOGGLE = 'module_toggle',
  COMPLIANCE = 'compliance',
  OTHER = 'other',
}

export class CreateAdminRequestDto {
  @IsEnum(AdminRequestType)
  type: AdminRequestType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  detail: string;

  @IsString()
  @IsOptional()
  requestedBy?: string;
}

