import { Injectable } from "@nestjs/common";
import { IAuthRepository } from "./auth.repository.interface";
import { User } from "../entities/user.entity";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class AuthMockRepository implements IAuthRepository {
  private users: User[] = [];

  async findByEmail(_tenantId: string, email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) || null;
  }

  async findById(_tenantId: string, id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async create(_tenantId: string, data: any): Promise<User> {
    const user: User = {
      id: uuidv4(),
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async update(
    _tenantId: string,
    id: string,
    data: Partial<User>,
  ): Promise<User> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error("User not found");

    this.users[index] = {
      ...this.users[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.users[index];
  }
}
