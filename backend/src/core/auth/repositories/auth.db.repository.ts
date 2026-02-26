import { Injectable } from "@nestjs/common";
import { IAuthRepository } from "./auth.repository.interface";
import { PrismaService } from "../../../persistence/prisma.service";
import { User } from "../entities/user.entity";

@Injectable()
export class AuthDbRepository implements IAuthRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(_tenantId: string, email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        userCompanies: {
          include: {
            company: true,
          },
        },
      },
    }) as any;
  }

  async findById(_tenantId: string, id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        userCompanies: {
          include: {
            company: true,
          },
        },
      },
    }) as any;
  }

  async create(_tenantId: string, data: any): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    }) as any;
  }

  async update(
    _tenantId: string,
    id: string,
    data: Partial<User>,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: data as any,
    }) as any;
  }
}
