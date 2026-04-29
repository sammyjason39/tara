import { IsNotEmpty, IsString } from "class-validator";

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  industry: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  latitude?: number;
  longitude?: number;
  google_place_id?: string;
  formatted_address?: string;
  geofence_radius?: number;
}
