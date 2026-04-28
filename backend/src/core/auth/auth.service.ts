import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from "@nestjs/common";
import { IAuthRepository } from "./repositories/auth.repository.interface";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { PrismaService } from "../../persistence/prisma.service";

@Injectable()
export class AuthService {
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
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Check if user exists (globally by email)
    const existing = await this.authRepo.findByEmail(this.systemCtx, dto.email);
    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(dto.password, salt);

    // 2. Auto-Provision Tenant and User in a transaction
    return await this.prisma.$transaction(async (tx) => {
      const newTenantId = `tnt-${Math.random().toString(36).substring(2, 8)}`;
      
      // Create the Tenant record first
      await tx.tenants.create({
        data: {
          id: newTenantId,
          name: `${dto.first_name}'s Organization`,
          code: `ORG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          status: 'active',
        },
      });

      // Create the User record linked to the new Tenant
      const user = await tx.users.create({
        data: {
          email: dto.email,
          password_hash,
          first_name: dto.first_name,
          last_name: dto.last_name,
          phone: dto.phone,
          tenant_id: newTenantId,
        },
      });

      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  async login(dto: LoginDto) {
    const user = await this.authRepo.findByEmail(this.systemCtx, dto.email);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = { sub: user.id, email: user.email };
    const token = (jwt.sign as any)(payload, this.jwtSecret, { expiresIn: "1d" });

    const { password_hash: _, ...userWithoutPassword } = user;
    return {
      token,
      user: {
        ...userWithoutPassword,
        user_companies: (user as any).user_companies || [],
      },
    };
  }

  async verifyAndGetProfile(token: string) {
    try {
      const decoded: any = jwt.verify(token, this.jwtSecret);
      const user = await this.authRepo.findById(this.systemCtx, decoded.sub);

      if (!user) throw new UnauthorizedException("User not found");

      const { password_hash: _, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        user_companies: (user as any).user_companies || [],
      };
    } catch (e) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
