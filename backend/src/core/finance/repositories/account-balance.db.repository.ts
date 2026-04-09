import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IAccountBalanceRepository } from './interfaces/account-balance.repository.interface';
import { AccountBalance, AccountBalanceSnapshot } from '../domain/finance.interfaces';

@Injectable()
export class AccountBalanceDbRepository implements IAccountBalanceRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findBalance(params: {
    tenantId: string;
    companyId: string;
    fiscalPeriodId: string;
    accountId: string;
    currency: string;
    branchId: string;
    locationId: string;
    departmentId?: string;
    costCenterId?: string;
    projectId?: string;
  }): Promise<AccountBalance | null> {
    const res = await this.db.accountBalance.findUnique({
      where: {
        account_balance_dimensions: {
          tenantId: params.tenantId,
          fiscalPeriodId: params.fiscalPeriodId,
          accountId: params.accountId,
          currency: params.currency,
          branchId: params.branchId,
          locationId: params.locationId,
          departmentId: params.departmentId || 'GLOBAL',
          costCenterId: params.costCenterId || 'GLOBAL',
          projectId: params.projectId || 'GLOBAL'
        }
      }
    });
    return res as unknown as AccountBalance;
  }

  async updateBalance(tenantId: string, companyId: string, data: Partial<AccountBalance>): Promise<void> {
    await this.db.accountBalance.updateMany({
      where: {
        tenantId,
        fiscalPeriodId: data.fiscalPeriodId,
        accountId: data.accountId,
        currency: data.currency,
      },
      data: {
        debitTotal: data.debitTotal ? new Prisma.Decimal(data.debitTotal.toString()) : undefined,
        creditTotal: data.creditTotal ? new Prisma.Decimal(data.creditTotal.toString()) : undefined,
        netBalance: data.netBalance ? new Prisma.Decimal(data.netBalance.toString()) : undefined,
        version: { increment: 1 }
      }
    });
  }

  async incrementBalance(tenantId: string, companyId: string, params: {
    fiscalPeriodId: string;
    accountId: string;
    currency: string;
    branchId: string;
    locationId: string;
    departmentId?: string;
    costCenterId?: string;
    projectId?: string;
  }, delta: { debit?: Prisma.Decimal; credit?: Prisma.Decimal; net?: Prisma.Decimal }): Promise<void> {
    const debit = delta.debit ? new Prisma.Decimal(delta.debit.toString()) : new Prisma.Decimal(0);
    const credit = delta.credit ? new Prisma.Decimal(delta.credit.toString()) : new Prisma.Decimal(0);
    const net = delta.net ? new Prisma.Decimal(delta.net.toString()) : debit.minus(credit);

    await this.db.accountBalance.upsert({
      where: {
        account_balance_dimensions: {
          tenantId,
          fiscalPeriodId: params.fiscalPeriodId,
          accountId: params.accountId,
          currency: params.currency,
          branchId: params.branchId,
          locationId: params.locationId,
          departmentId: params.departmentId || 'GLOBAL',
          costCenterId: params.costCenterId || 'GLOBAL',
          projectId: params.projectId || 'GLOBAL'
        }
      },
      update: {
        debitTotal: { increment: debit },
        creditTotal: { increment: credit },
        netBalance: { increment: net },
        version: { increment: 1 }
      } as any,
      create: {
        tenantId,
        fiscalPeriodId: params.fiscalPeriodId,
        accountId: params.accountId,
        currency: params.currency,
        branchId: params.branchId,
        locationId: params.locationId,
        departmentId: params.departmentId || 'GLOBAL',
        costCenterId: params.costCenterId || 'GLOBAL',
        projectId: params.projectId || 'GLOBAL',
        debitTotal: debit,
        creditTotal: credit,
        netBalance: net,
        version: 1
      } as any
    });
  }

  async createSnapshot(tenantId: string, companyId: string, data: Partial<AccountBalanceSnapshot>): Promise<AccountBalanceSnapshot> {
    const created = await this.db.accountBalanceSnapshot.create({
      data: {
        id: 'iyavi2n2',
        
        tenantId,
        fiscalPeriodId: data.fiscalPeriodId!,
        snapshotDate: data.snapshotDate || new Date(),
        snapshotType: data.snapshotType || 'EOM',
        balancesData: data.balancesData || {},
      }
    });
    return created as unknown as AccountBalanceSnapshot;
  }

  async reset(tenantId: string, companyId: string): Promise<void> {
    await this.db.accountBalance.deleteMany({
      where: { tenantId }
    });
  }
}
