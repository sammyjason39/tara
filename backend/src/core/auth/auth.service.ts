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

@Injectable()
export class AuthService {
  private readonly jwtSecret =
    process.env.JWT_SECRET || "dev-secret-key-do-not-use-in-prod";

  constructor(
    @Inject(IAuthRepository) private readonly authRepo: IAuthRepository,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.authRepo.findByEmail("system", dto.email);

    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.authRepo.create("system", {
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(dto: LoginDto) {
    const user = await this.authRepo.findByEmail("system", dto.email);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = { sub: user.id, email: user.email };
    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: "1d" });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      token,
      user: userWithoutPassword,
    };
  }

  async verifyAndGetProfile(token: string) {
    try {
      const decoded: any = jwt.verify(token, this.jwtSecret);
      const user = await this.authRepo.findById("system", decoded.sub);

      if (!user) throw new UnauthorizedException("User not found");

      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (e) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
