import { IsOptional, IsString } from 'class-validator';

export class RoutePaymentDto {
  @IsString()
  @IsOptional()
  providerId?: string;
}

