import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTimelineEventDto {
  @IsString()
  @IsNotEmpty()
  opportunityId: string;

  @IsString()
  @IsOptional()
  lead_id?: string;

  @IsString()
  @IsNotEmpty()
  channel: "note" | "email" | "whatsapp" | "sms" | "call" | "meeting";

  @IsString()
  @IsNotEmpty()
  direction: "outbound" | "inbound" | "internal";

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsString()
  @IsOptional()
  detail?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
