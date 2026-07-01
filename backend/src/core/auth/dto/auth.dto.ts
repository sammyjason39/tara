import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  full_name: string;

  @IsString()
  @IsOptional()
  employee_code?: string;

  @IsString()
  @IsOptional()
  pin?: string;
}

export class ChangePasswordDto {
  @IsString()
  current_password: string;

  @IsString()
  @MinLength(6)
  new_password: string;
}

export class ResetPasswordDto {
  @IsString()
  employee_id: string;

  @IsString()
  @MinLength(6)
  new_password: string;
}

export class SetPinDto {
  @IsString()
  @MinLength(6)
  pin: string;
}

export class ForceChangePasswordDto {
  @IsString()
  @MinLength(8)
  new_password: string;

  @IsString()
  @MinLength(8)
  confirm_password: string;
}

export class VerifyPinDto {
  @IsString()
  @MinLength(6)
  pin: string;
}
