import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IAccountBalanceRepository } from './interfaces/account-balance.repository.interface';
import { AccountBalance, AccountBalanceSnapshot } from '../domain/finance.interfaces';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AccountBalanceDbRepository implements IAccountBalanceRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findBalance(params: {
    tenant_id: string;
    company_id: string;
    fiscalPeriodId: string;
    accountId: string;
    currency: string;
    branch_id: string;
    location_id: string;
    departmentId?: string;
    costCenterId?: string;
    projectId?: string;
  }): Promise<AccountBalance | null> {
    const res = await this.db.finance_account_balances.findUnique({
      where: {
        tenant_id_fiscal_period_id_account_id_currency_branch_id_location_id_department_id_cost_center_id_project_id: {
          tenant_id: params.tenant_id,

          fiscal_period_id: params.fiscalPeriodId,
          account_id: params.accountId,
          currency: params.currency,
          branch_id: params.branch_id,
          location_id: params.location_id,
          department_id: params.departmentId || 'GLOBAL',
          cost_center_id: params.costCenterId || 'GLOBAL',
          project_id: params.projectId || 'GLOBAL'
        }
      }
    });
    return res as unknown as AccountBalance;
  }

  async updateBalance(tenant_id: string, company_id: string, data: Partial<AccountBalance>): Promise<void> {
    await this.db.finance_account_balances.updateMany({
      where: {
        tenant_id: tenant_id,
        company_id: company_id,
        fiscal_period_id: data.fiscalPeriodId,
        account_id: data.accountId,
        currency: data.currency,
      },
      data: {
        debit_total: data.debitTotal ? new Prisma.Decimal(data.debitTotal.toString()) : undefined,
        credit_total: data.creditTotal ? new Prisma.Decimal(data.creditTotal.toString()) : undefined,
        net_balance: data.netBalance ? new Prisma.Decimal(data.netBalance.toString()) : undefined,
        version: { increment: 1 },
        updated_at: new Date(),
      }
    });
  }

  async incrementBalance(tenant_id: string, company_id: string, params: {
    fiscalPeriodId: string;
    accountId: string;
    currency: string;
    branch_id: string;
    location_id: string;
    departmentId?: string;
    costCenterId?: string;
    projectId?: string;
  }, delta: { debit?: Prisma.Decimal; credit?: Prisma.Decimal; net?: Prisma.Decimal }): Promise<void> {
    const debit = delta.debit ? new Prisma.Decimal(delta.debit.toString()) : new Prisma.Decimal(0);
    const credit = delta.credit ? new Prisma.Decimal(delta.credit.toString()) : new Prisma.Decimal(0);
    const net = delta.net ? new Prisma.Decimal(delta.net.toString()) : debit.minus(credit);

    const dims = {
      tenant_id: tenant_id,
      fiscal_period_id: params.fiscalPeriodId,
      account_id: params.accountId,
      currency: params.currency,
      branch_id: params.branch_id,
      location_id: params.location_id,
      department_id: params.departmentId || 'GLOBAL',
      cost_center_id: params.costCenterId || 'GLOBAL',
      project_id: params.projectId || 'GLOBAL'
    };

    // company_id is NOT part of the compound unique key, so it must be excluded
    // from the `where`. It also FKs to companies(id): callers sometimes pass the
    // tenant_id as a placeholder (no real company), which would violate the FK,
    // so normalize that case to null (tenant-level balance).
    const safeCompanyId = company_id && company_id !== tenant_id ? company_id : null;

    await this.db.finance_account_balances.upsert({
      where: {
        tenant_id_fiscal_period_id_account_id_currency_branch_id_location_id_department_id_cost_center_id_project_id: dims
      },
      update: {
        debit_total: { increment: debit },
        credit_total: { increment: credit },
        net_balance: { increment: net },
        version: { increment: 1 },
        updated_at: new Date(),
      },
      create: {
        id: uuid(),
        ...dims,
        company_id: safeCompanyId,
        debit_total: debit,
        credit_total: credit,
        net_balance: net,
        version: 1,
        updated_at: new Date(),
      }
    });
  }

  async createSnapshot(tenant_id: string, company_id: string, data: Partial<AccountBalanceSnapshot>): Promise<AccountBalanceSnapshot> {
    const created = await this.db.finance_account_balance_snapshots.create({
      data: {
        id: uuid(),
        tenant_id: tenant_id,
        company_id: company_id,
        fiscal_period_id: data.fiscalPeriodId!,
        account_id: data.accountId || 'GLOBAL',
        currency: data.currency || 'IDR',
        opening_balance: data.openingBalance || 0,
        debit_total: data.debitTotal || 0,
        credit_total: data.creditTotal || 0,
        closing_balance: data.closingBalance || 0,
        snapshot_sequence: data.snapshotSequence || 0,
        snapshot_date: data.snapshotDate || new Date(),
        snapshotType: data.snapshotType || 'EOM',
        balances_data: data.balancesData || {},
      }
    });
    return created as any as AccountBalanceSnapshot;
  }

  async reset(tenant_id: string, company_id: string): Promise<void> {
    await this.db.finance_account_balances.deleteMany({
      where: { tenant_id: tenant_id, company_id: company_id }
    });
  }
}
