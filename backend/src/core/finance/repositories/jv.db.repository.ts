import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../persistence/prisma.service';
import { IJVRepository } from './interfaces/jv.repository.interface';

@Injectable()
export class JVDbRepository implements IJVRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  private getDb(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx || this.db;
  }

  async findProfileByScope(tenant_id: string, scope: { ecommerce_id?: string; branch_id?: string; company_id?: string }): Promise<any> {
    const scopes = await this.db.finance_jv_scopes.findMany({
      where: {
        jv_profiles: {
          tenant_id,
          is_active: true
        },
        OR: [
          { ecommerce_id: scope.ecommerce_id },
          { branch_id: scope.branch_id },
          { company_id: scope.company_id },
          { ecommerce_id: null, branch_id: null, company_id: null } 
        ]
      },
      include: {
        jv_profiles: true
      }
    });

    if (scopes.length === 0) return null;

    const sorted = scopes.sort((a, b) => {
      const getPriority = (s: any) => {
        if (s.ecommerce_id) return 1;
        if (s.branch_id) return 2;
        if (s.company_id) return 3;
        return 4;
      };
      return getPriority(a) - getPriority(b);
    });

    return sorted[0].jv_profiles;
  }

  async getParticipants(jv_profile_id: string): Promise<any[]> {
    return this.db.finance_jv_participants.findMany({
      where: { jv_profile_id }
    });
  }

  async createSnapshot(data: { jv_profile_id: string; journal_id: string; config_json: any }, tx?: Prisma.TransactionClient): Promise<void> {
    await this.getDb(tx).finance_jv_snapshots.create({
      data: {
        id: randomUUID(),
        jv_profile_id: data.jv_profile_id,
        journal_id: data.journal_id,
        config_json: data.config_json
      }
    });
  }

  async writeLedger(entries: any[], tx?: Prisma.TransactionClient): Promise<void> {
    await this.getDb(tx).finance_jv_ledger.createMany({
      data: entries.map(e => ({
        id: randomUUID(),
        tenant_id: e.tenant_id,
        jv_profile_id: e.jv_profile_id,
        journal_id: e.journal_id,
        line_id: e.line_id,
        participant_id: e.participant_id,
        allocated_amt: e.allocated_amt,
        side: e.side,
        account_code: e.account_code,
        type: e.type,
        period_id: e.period_id
      }))
    });
  }

  async getLedgerEntries(tenant_id: string, filters: any): Promise<any[]> {
    return this.db.finance_jv_ledger.findMany({
      where: {
        tenant_id,
        ...filters
      }
    });
  }
  
  async findParticipation(participant_tenant_id: string, host_tenant_id: string): Promise<any[]> {
    return this.db.finance_jv_participants.findMany({
      where: {
        participant_tenant_id,
        jv_profiles: host_tenant_id ? {
          tenant_id: host_tenant_id,
          is_active: true
        } : {
          is_active: true
        }
      },
      include: {
        jv_profiles: {
          include: {
            scopes: true
          }
        }
      }
    });
  }
}
