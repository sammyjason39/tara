import { IsArray, IsIn, IsNotEmpty, IsString } from "class-validator";

export class ConnectAccountDto {
  @IsString()
  @IsIn(["meta", "google"])
  provider: "meta" | "google";

  @IsString()
  @IsNotEmpty()
  account_name: string;

  @IsArray()
  scopes: string[];
}
