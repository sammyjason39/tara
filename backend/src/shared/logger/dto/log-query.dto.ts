import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LogQueryDto {
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() event?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
