import { Injectable, UnauthorizedException, ConflictException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../persistence/prisma.service';
import type { Employee } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  department_id?: string;
  office_location_id?: string;
  context?: string;
  interface?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn = '8h';
  private readonly pinRotationDays = 30;

  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET must be set in production');
    }
    this.jwtSecret = secret || 'dev-secret-key-do-not-use-in-prod';
  }

  private getDefaultSeedPassword(): string {
    return process.env.SEED_PASSWORD || 'demo123';
  }

  private async isDefaultSeedPasswordHash(passwordHash: string | null | undefined): Promise<boolean> {
    if (!passwordHash) return false;
    return bcrypt.compare(this.getDefaultSeedPassword(), passwordHash);
  }

  private async mustChangePasswordFor(employee: Employee): Promise<boolean> {
    // Password already customized once — never force the first-login modal again.
    if (employee.password_changed_at) return false;

    if (employee.must_change_password) return true;
    return this.isDefaultSeedPasswordHash(employee.password_hash);
  }

  private shouldRotatePin(employee: Employee): boolean {
    if (!employee.pin_hash) return false;
    if (!employee.pin_changed_at) return true;
    const ageMs = Date.now() - employee.pin_changed_at.getTime();
    return ageMs >= this.pinRotationDays * 24 * 60 * 60 * 1000;
  }

  /** Fix legacy rows where password was changed but flags were not cleared. */
  private async healPasswordFlags(employee: Employee): Promise<Employee> {
    if (employee.password_changed_at) {
      if (employee.must_change_password) {
        return this.prisma.employee.update({
          where: { id: employee.id },
          data: { must_change_password: false },
        });
      }
      return employee;
    }

    const stillDefault = await this.isDefaultSeedPasswordHash(employee.password_hash);
    if (!stillDefault) {
      return this.prisma.employee.update({
        where: { id: employee.id },
        data: {
          must_change_password: false,
          password_changed_at: new Date(),
        },
      });
    }

    return employee;
  }

  private assertNewPasswordAllowed(newPassword: string): void {
    if (newPassword === this.getDefaultSeedPassword()) {
      throw new BadRequestException(
        'Password baru tidak boleh sama dengan password default sementara. Pilih password yang lebih kuat.',
      );
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('Password baru minimal 8 karakter');
    }
  }

  private mapUser(employee: Employee & { role?: { role_name: string } | null; department?: { name: string } | null; office?: { location_name: string } | null }) {
    return {
      id: employee.id,
      email: employee.email,
      full_name: employee.full_name,
      employee_code: employee.employee_code,
      role: employee.role?.role_name || 'Employee',
      department: employee.department?.name || null,
      office: employee.office?.location_name || null,
      language_preference: employee.language_preference,
    };
  }

  async login(email: string, password: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true, department: true, office: true },
    });

    if (!employee || !employee.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, employee.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (employee.employment_status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const healed = await this.healPasswordFlags(employee);
    const must_change_password = await this.mustChangePasswordFor(healed);

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { last_login_at: new Date() },
    });

    const payload: JwtPayload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role?.role_name || 'Employee',
      department_id: employee.department_id || undefined,
      office_location_id: employee.office_location_id || undefined,
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });

    return {
      token,
      must_change_password,
      user: this.mapUser(employee),
    };
  }

  async register(data: { email: string; password: string; full_name: string; employee_code?: string; pin?: string }) {
    const existing = await this.prisma.employee.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already in use');

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const password_hash = await bcrypt.hash(data.password, rounds);
    const must_change_password = data.password === this.getDefaultSeedPassword();

    let pin_hash: string | undefined;
    if (data.pin) {
      if (!/^\d{6}$/.test(data.pin)) {
        throw new BadRequestException('PIN must be exactly 6 digits');
      }
      pin_hash = await bcrypt.hash(data.pin, rounds);
    }

    const employee = await this.prisma.employee.create({
      data: {
        email: data.email.toLowerCase(),
        password_hash,
        pin_hash,
        must_change_password,
        full_name: data.full_name,
        employee_code: data.employee_code || `EMP-${Date.now().toString(36).toUpperCase()}`,
        hire_date: new Date(),
        employment_status: 'active',
      },
    });

    return { id: employee.id, email: employee.email, full_name: employee.full_name };
  }

  async changePassword(employeeId: string, currentPassword: string, newPassword: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || !employee.password_hash) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(currentPassword, employee.password_hash);
    if (!isMatch) throw new UnauthorizedException('Current password is incorrect');

    this.assertNewPasswordAllowed(newPassword);

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const password_hash = await bcrypt.hash(newPassword, rounds);

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        password_hash,
        must_change_password: false,
        password_changed_at: new Date(),
      },
    });
    return { success: true };
  }

  async forceChangePassword(employeeId: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Konfirmasi password tidak cocok');
    }

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new UnauthorizedException('User not found');

    const mustChange = await this.mustChangePasswordFor(employee);
    if (!mustChange) {
      throw new ForbiddenException('Password change is not required for this account');
    }

    this.assertNewPasswordAllowed(newPassword);

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const password_hash = await bcrypt.hash(newPassword, rounds);

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        password_hash,
        must_change_password: false,
        password_changed_at: new Date(),
      },
    });

    return { success: true };
  }

  async resetPassword(employeeId: string, newPassword: string) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const password_hash = await bcrypt.hash(newPassword, rounds);
    const must_change_password = newPassword === this.getDefaultSeedPassword();

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        password_hash,
        must_change_password,
        password_changed_at: must_change_password ? null : new Date(),
      },
    });
    return { success: true };
  }

  async setPin(employeeId: string, pin: string) {
    if (!/^\d{6}$/.test(pin)) {
      throw new BadRequestException('PIN must be exactly 6 digits');
    }
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const pin_hash = await bcrypt.hash(pin, rounds);
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { pin_hash, pin_changed_at: new Date() },
    });
    return { success: true };
  }

  async verifyPin(employeeId: string, pin: string): Promise<{ verified: boolean }> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || !employee.pin_hash) {
      return { verified: false };
    }
    const isMatch = await bcrypt.compare(pin, employee.pin_hash);
    return { verified: isMatch };
  }

  async hasPinSet(employeeId: string): Promise<boolean> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { pin_hash: true },
    });
    return !!employee?.pin_hash;
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Whether the employee has ever logged into the web/mobile app. */
  async hasEverLoggedIn(employeeId: string): Promise<boolean> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { last_login_at: true, password_changed_at: true },
    });
    if (!employee) return false;
    return employee.last_login_at != null || employee.password_changed_at != null;
  }

  /** Reveal temporary password only when still on the default seed hash. */
  async getTemporaryPasswordForOnboarding(employeeId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { password_hash: true },
    });
    if (!employee?.password_hash) return null;
    const isDefault = await this.isDefaultSeedPasswordHash(employee.password_hash);
    return isDefault ? this.getDefaultSeedPassword() : null;
  }

  async getProfile(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true, department: true, office: true },
    });
    if (!employee) throw new UnauthorizedException('User not found');

    const healed = await this.healPasswordFlags(employee);
    const must_change_password = await this.mustChangePasswordFor(healed);
    const should_rotate_pin = this.shouldRotatePin(healed);

    return {
      id: healed.id,
      email: healed.email,
      full_name: healed.full_name,
      employee_code: healed.employee_code,
      phone: healed.phone,
      role: employee.role?.role_name || 'Employee',
      department: employee.department?.name || null,
      department_id: healed.department_id,
      office: employee.office?.location_name || null,
      office_location_id: healed.office_location_id,
      hire_date: healed.hire_date,
      employment_status: healed.employment_status,
      language_preference: healed.language_preference,
      must_change_password,
      should_rotate_pin,
      pin_changed_at: healed.pin_changed_at?.toISOString() ?? null,
    };
  }
}
