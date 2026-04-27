import { Prisma } from '@prisma/client';

export interface IJVRepository {
  findProfileByScope(tenant_id: string, scope: { ecommerce_id?: string; branch_id?: string; company_id?: string }): Promise<any>;
  getParticipants(jv_profile_id: string): Promise<any[]>;
  createSnapshot(data: { jv_profile_id: string; journal_id: string; config_json: any }, tx?: Prisma.TransactionClient): Promise<void>;
  writeLedger(entries: any[], tx?: Prisma.TransactionClient): Promise<void>;
  getLedgerEntries(tenant_id: string, filters: any): Promise<any[]>;
  findParticipation(participant_tenant_id: string, host_tenant_id: string): Promise<any[]>;
}
