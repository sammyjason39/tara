import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IJVRepository } from './interfaces/jv.repository.interface';

@Injectable()
export class JVMockRepository implements IJVRepository {
  async findProfileByScope(tenant_id: string, scope: { ecommerce_id?: string; branch_id?: string; company_id?: string }): Promise<any> {
    return null;
  }
  async getParticipants(jv_profile_id: string): Promise<any[]> {
    return [];
  }
  async createSnapshot(data: { jv_profile_id: string; journal_id: string; config_json: any }, tx?: Prisma.TransactionClient): Promise<void> {}
  async writeLedger(entries: any[], tx?: Prisma.TransactionClient): Promise<void> {}
  async getLedgerEntries(tenant_id: string, filters: any): Promise<any[]> {
    return [];
  }
  async findParticipation(participant_tenant_id: string, host_tenant_id: string): Promise<any[]> {
    return [];
  }
}
