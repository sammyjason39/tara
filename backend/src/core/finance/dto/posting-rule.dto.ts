import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PostingSide } from '../domain/finance.constants';

class PostingRuleLineDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsEnum(PostingSide)
  side: PostingSide;

  @IsString()
  @IsNotEmpty()
  amountExpression: string;
}

export class CreatePostingRuleDto {
  @IsString()
  @IsNotEmpty()
  event_type: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostingRuleLineDto)
  lines: PostingRuleLineDto[];
}
