import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { CompanyRegistrationService } from "./company-registration.service";
import { CreateCompanyDto } from "./dto/create-company.dto";

interface RequestWithUser extends Request {
  user?: any; // To be set via an AuthGuard in actual production, we extract from token directly here for testing
}

@Controller("v1/auth/company")
export class CompanyRegistrationController {
  constructor(
    private readonly registrationService: CompanyRegistrationService,
  ) {}

  @Post("provision")
  async provisionCompany(
    @Req() request: RequestWithUser,
    @Body() dto: CreateCompanyDto,
  ) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing token");
    }
    const token = authHeader.split(" ")[1];

    const data = await this.registrationService.provisionTenant(token, dto);

    return {
      success: true,
      message: "Company provisioned successfully",
      data,
    };
  }
}
