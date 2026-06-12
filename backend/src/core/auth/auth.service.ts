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
  private readonly jwtSecret: string;

  private readonly systemCtx: TenantContext = {
    tenant_id: "system",
    company_id: "system",
    branch_id: "default",
    user_id: "system",
  };

  constructor(
    @Inject(IAuthRepository) private readonly authRepo: IAuthRepository,
    private readonly prisma: PrismaService,
  ) {
    const secret = process.env.JWT_SECRET;
    const INSECURE_DEFAULT = "dev-secret-key-do-not-use-in-prod";
    if (!secret || secret === INSECURE_DEFAULT) {
      if (process.env.NODE_ENV === "production") {
        // Fail fast: refuse to run with a missing/known JWT secret in production.
        // A known secret means anyone can forge valid tokens for any user.
        throw new Error(
          "FATAL: JWT_SECRET must be set to a strong, secret value in production. Refusing to start with a missing or default secret.",
        );
      }
      this.jwtSecret = INSECURE_DEFAULT;
    } else {
      this.jwtSecret = secret;
    }
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase();
    
    // 1. Check if user exists (globally by email)
    const existing = await this.authRepo.findByEmail(this.systemCtx, normalizedEmail);
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
          email: normalizedEmail,
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
    const normalizedEmail = dto.email.toLowerCase();
    const user = await this.authRepo.findByEmail(this.systemCtx, normalizedEmail);

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
    const userCompanies = ((user as any).user_companies || []).map((uc: any) => ({
      ...uc,
      company: uc.companies || uc.company,
    }));

    return {
      token,
      user: {
        ...userWithoutPassword,
        user_companies: userCompanies,
      },
    };
  }

  async verifyAndGetProfile(token: string) {
    try {
      const decoded: any = jwt.verify(token, this.jwtSecret);
      const user = await this.authRepo.findById(this.systemCtx, decoded.sub);

      if (!user) throw new UnauthorizedException("User not found");

      const { password_hash: _, ...userWithoutPassword } = user;
      const userCompanies = ((user as any).user_companies || []).map((uc: any) => ({
        ...uc,
        company: uc.companies || uc.company,
      }));

      return {
        ...userWithoutPassword,
        user_companies: userCompanies,
      };
    } catch (e) {
      throw new UnauthorizedException("Invalid token");
    }
  }

  async verifyEmail(email: string): Promise<boolean> {
    const normalizedEmail = email?.toLowerCase();
    if (!normalizedEmail) return false;
    const user = await this.authRepo.findByEmail(this.systemCtx, normalizedEmail);
    return !!user;
  }

  async resetPasswordDirect(email: string, newPassword: string): Promise<void> {
    const normalizedEmail = email?.toLowerCase();
    if (!normalizedEmail) throw new UnauthorizedException("Invalid email");
    const user = await this.authRepo.findByEmail(this.systemCtx, normalizedEmail);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await this.authRepo.update(this.systemCtx, user.id, {
      password_hash,
    } as any);
  }
}
