import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class ConfirmQuoteDto {
  @IsString()
  @IsNotEmpty()
  quoteReference: string;

  @IsString()
  @IsOptional()
  quoteNotes?: string;

  @IsString()
  @IsOptional()
  quoteAttachment?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quotedTotal?: number;
}
