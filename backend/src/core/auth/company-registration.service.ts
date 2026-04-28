import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { IAuthRepository } from "./repositories/auth.repository.interface";
import { IProvisioningRepository } from "./repositories/provisioning.repository.interface";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { getCurrencyForCountry } from "../../shared/countries";
import { TenantContext } from "../../gateway/tenant-context.interface";

@Injectable()
export class CompanyRegistrationService {
  private readonly jwtSecret =
    process.env.JWT_SECRET || "dev-secret-key-do-not-use-in-prod";

  private readonly systemCtx: TenantContext = {
    tenant_id: "system",
    company_id: "system",
    branch_id: "default",
    user_id: "system",
  };

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

    const user = await this.authRepo.findById(this.systemCtx, user_id);
    if (!user) throw new UnauthorizedException("User not found");

    // 2. Perform Tenant Provisioning via Repository
    const result = await this.provisioningRepo.provisionTenant({
      tenant_id: user.tenant_id,
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

    // 3. Associate Tenant with User (Crucial for Mock/Demo logic)
    // We add the user as OWNER of the new tenant
    await this.authRepo.update(this.systemCtx, user_id, {
      user_companies: [
        ...(user.user_companies || []),
        {
          id: uuidv4(),
          user_id,
          tenant_id: result.tenant_id,
          role: "OWNER",
          is_default: true,
        },
      ],
    });

    return result;
  }
}
