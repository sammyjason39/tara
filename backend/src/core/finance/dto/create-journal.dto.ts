import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  Min,
  ArrayMinSize,
} from "class-validator";
import { Type, Transform } from "class-transformer";

export class JournalLineDto {
  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value?.toString())
  debit: number;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value?.toString())
  credit: number;
}

export class CreateJournalDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  ref?: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Journal entry must have at least 2 line items' })
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
