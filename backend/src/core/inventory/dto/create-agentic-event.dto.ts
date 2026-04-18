import { IsString, IsNotEmpty, IsObject } from "class-validator";

export class CreateAgenticEventDto {
  @IsString()
  @IsNotEmpty()
  event_type: string;

  @IsString()
  @IsNotEmpty()
  entity_id: string;

  @IsString()
  @IsNotEmpty()
  entity_type: string;

  @IsObject()
  @IsNotEmpty()
  payload: any;
}
