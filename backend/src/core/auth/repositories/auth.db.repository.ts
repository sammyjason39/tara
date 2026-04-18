import { Injectable } from "@nestjs/common";
import { IAuthRepository } from "./auth.repository.interface";
import { PrismaService } from "../../../persistence/prisma.service";
import { User } from "../entities/user.entity";

@Injectable()
export class AuthDbRepository implements IAuthRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(tenant_id: string, email: string): Promise<User | null> {
    return this.prisma.users.findUnique({
      where: {
        tenant_id_email: {
          tenant_id: tenant_id,
          email,
        },
      },
      include: {
        user_companies: {
          include: {
            companies: true,
          },
        },
      },
    }) as any;
  }

  async findById(_tenant_id: string, id: string): Promise<User | null> {
    return this.prisma.users.findUnique({
      where: { id },
      include: {
        user_companies: {
          include: {
            companies: true,
          },
        },
      },
    }) as any;
  }

  async create(tenant_id: string, data: any): Promise<User> {
    return this.prisma.users.create({
      data: {
        id: 'e7b9ynfa',
        updated_at: new Date(),
        tenant_id: tenant_id,
        email: data.email,
        password_hash: data.password_hash,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      },
    }) as any;
  }

  async update(
    _tenant_id: string,
    id: string,
    data: Partial<User>,
  ): Promise<User> {
    return this.prisma.users.update({
      where: { id },
      data: data as any,
    }) as any;
  }
}
