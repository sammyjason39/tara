import { User } from "../entities/user.entity";

export interface IAuthRepository {
  findByEmail(tenantId: string, email: string): Promise<User | null>;
  findById(tenantId: string, id: string): Promise<User | null>;
  create(tenantId: string, data: any): Promise<User>;
  update(tenantId: string, id: string, data: Partial<User>): Promise<User>;
}

export const IAuthRepository = Symbol("IAuthRepository");
