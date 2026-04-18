import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LogQueryDto {
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() event?: string;
  @IsOptional() @IsString() user_id?: string;
  @IsOptional() @IsString() start_date?: string;
  @IsOptional() @IsString() end_date?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
