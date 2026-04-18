import { User } from "../entities/user.entity";

export interface IAuthRepository {
  findByEmail(tenant_id: string, email: string): Promise<User | null>;
  findById(tenant_id: string, id: string): Promise<User | null>;
  create(tenant_id: string, data: any): Promise<User>;
  update(tenant_id: string, id: string, data: Partial<User>): Promise<User>;
}

export const IAuthRepository = Symbol("IAuthRepository");
