import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { IAuthRepository } from "./repositories/auth.repository.interface";
import { IProvisioningRepository } from "./repositories/provisioning.repository.interface";
import * as jwt from "jsonwebtoken";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { getCurrencyForCountry } from "../../shared/countries";

@Injectable()
export class CompanyRegistrationService {
  private readonly jwtSecret =
    process.env.JWT_SECRET || "dev-secret-key-do-not-use-in-prod";

  constructor(
    @Inject(IAuthRepository) private readonly authRepo: IAuthRepository,
    @Inject(IProvisioningRepository)
    private readonly provisioningRepo: IProvisioningRepository,
  ) {}

  async provisionTenant(token: string, dto: CreateCompanyDto) {
    // 1. Verify user token
    let decoded;
    try {
      decoded = jwt.verify(token, this.jwtSecret) as any;
    } catch (e) {
      throw new UnauthorizedException("Invalid token");
    }

    const user_id = decoded.sub;

    const user = await this.authRepo.findById("system", user_id);
    if (!user) throw new UnauthorizedException("User not found");

    // 2. Perform Tenant Provisioning via Repository
    return await this.provisioningRepo.provisionTenant({
      user_id,
      name: dto.name,
      country: dto.country,
      currency: getCurrencyForCountry(dto.country),
      industry: dto.industry,
      address: dto.address,
      user: {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
      },
    });
  }
}
