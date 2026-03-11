import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class SignContractDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(["SUPPLIER", "PROCUREMENT_HOD", "FINANCE_HOD"])
  party: "SUPPLIER" | "PROCUREMENT_HOD" | "FINANCE_HOD";
}
