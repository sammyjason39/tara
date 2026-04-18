import { Injectable } from "@nestjs/common";
import { IAuthRepository } from "./auth.repository.interface";
import { User, UserCompany } from "../entities/user.entity";
import { v4 as uuidv4 } from "uuid";
import { UserRole } from "../../../shared/roles";

@Injectable()
export class AuthMockRepository implements IAuthRepository {
  private users: User[] = [
    {
      id: "usr-superadmin-001",
      email: "superadmin@zenvix.com",
      password_hash:
        "$2a$10$yycoCL97bRvbcXdNjKXqP.J3fmu2HBt5yq4eKO4Vh0pwbYoD4ZWD2",
      first_name: "Superadmin",
      last_name: "Zenvix",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      userCompanies: [
        {
          id: uuidv4(),
          user_id: "usr-superadmin-001",
          tenant_id: "global",
          role: UserRole.SUPERADMIN,
          isDefault: true,
        },
      ],
    },
    {
      id: "7f15f139-8652-4796-a2b9-9fbf25515681",
      email: "admin@zenvix.com",
      password_hash:
        "$2a$10$Zvew.WpJmKKJlqIYTjCGgutQ41d5xn96.KZFJjrG5wuW1PqQcxoky",
      first_name: "Admin",
      last_name: "Zenvix",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      userCompanies: [
        {
          id: uuidv4(),
          user_id: "7f15f139-8652-4796-a2b9-9fbf25515681",
          tenant_id: "global",
          role: UserRole.SUPERADMIN,
          isDefault: true,
        },
      ],
    },
    {
      id: "usr-demo-001",
      email: "demo@zenvix.com",
      password_hash:
        "$2a$10$2ElqQbxQQvBLhApdgDQNouw1/KHiXFA9HlBacoGNV8dFuhVkt9sBW",
      first_name: "Demo",
      last_name: "User",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      userCompanies: [
        {
          id: uuidv4(),
          user_id: "usr-demo-001",
          tenant_id: "tenant-a",
          role: UserRole.OWNER,
          isDefault: true,
        },
      ],
    },
    {
      id: "user-owner-a",
      email: "owner-a@company.com",
      password_hash:
        "$2a$10$X7h6nL6v6B7Bv6B7Bv6B7Bv6B7Bv6B7Bv6B7Bv6B7Bv6B7Bv6B7B",
      first_name: "Owner",
      last_name: "A",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      userCompanies: [
        {
          id: uuidv4(),
          user_id: "user-owner-a",
          tenant_id: "tenant-a",
          role: UserRole.OWNER,
          isDefault: true,
        },
      ],
    },
  ];

  async findByEmail(_tenant_id: string, email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) || null;
  }

  async findById(_tenant_id: string, id: string): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    return user;
  }

  async create(_tenant_id: string, data: any): Promise<User> {
    const user: User = {
      id: uuidv4(),
      email: data.email,
      password_hash: data.password_hash,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      userCompanies: [],
    };
    this.users.push(user);
    return user;
  }

  async update(
    _tenant_id: string,
    id: string,
    data: Partial<User>,
  ): Promise<User> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error("User not found");

    this.users[index] = {
      ...this.users[index],
      ...data,
      updated_at: new Date(),
    };
    return this.users[index];
  }
}
