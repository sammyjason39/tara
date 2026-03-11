import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class ApproveFinalDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(["REQUESTER_HOD", "PROCUREMENT_HOD", "FINANCE_HOD"])
  approver: "REQUESTER_HOD" | "PROCUREMENT_HOD" | "FINANCE_HOD";
}
