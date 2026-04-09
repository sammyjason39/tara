import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IPostingRuleRepository } from './interfaces/posting-rule.repository.interface';
import { FinancePostingRule } from '../domain/finance.interfaces';
import { PostingRuleStatus } from '../domain/finance.constants';

@Injectable()
export class PostingRuleDbRepository implements IPostingRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRule(tenantId: string, companyId: string, eventType: string): Promise<FinancePostingRule | null> {
    const res = await (this.prisma as any).ledgerPostingRule.findFirst({
      where: { tenantId, eventType, isActive: true },
      include: { lines: true }
    });
    return res as unknown as FinancePostingRule;
  }

  async listRules(tenantId: string, companyId: string): Promise<FinancePostingRule[]> {
    const list = await (this.prisma as any).ledgerPostingRule.findMany({
      where: { tenantId },
      include: { lines: true }
    });
    return list as unknown as FinancePostingRule[];
  }

  async createRule(tenantId: string, companyId: string, data: Partial<FinancePostingRule>): Promise<FinancePostingRule> {
    const res = await (this.prisma as any).ledgerPostingRule.create({
      data: {
        id: 'pc4wa5y9',
        updated_at: new Date(),
        tenantId,
        companyId,
        eventType: data.eventType || '',
        description: data.description || '',
        status: PostingRuleStatus.ACTIVE,
        isActive: true,
        lines: {
          create: (data as any).lines?.map((l: any) => ({
            accountId: l.accountId,
            side: l.side,
            amountExpression: l.amountExpression || 'amount',
          })) || []
        }
      },
      include: { lines: true }
    });
    return res as unknown as FinancePostingRule;
  }

  async updateStatus(tenantId: string, companyId: string, ruleId: string, status: PostingRuleStatus): Promise<FinancePostingRule> {
    const res = await (this.prisma as any).ledgerPostingRule.update({
      where: { id: ruleId },
      data: { status, isActive: status === PostingRuleStatus.ACTIVE },
      include: { lines: true }
    });
    return res as unknown as FinancePostingRule;
  }

  async findByEventType(tenantId: string, companyId: string, eventType: string): Promise<FinancePostingRule[]> {
    const list = await (this.prisma as any).ledgerPostingRule.findMany({
      where: { tenantId, eventType },
      include: { lines: true }
    });
    return list as unknown as FinancePostingRule[];
  }

  async update(tenantId: string, companyId: string, ruleId: string, data: Partial<FinancePostingRule>): Promise<FinancePostingRule> {
      const res = await (this.prisma as any).ledgerPostingRule.update({
          where: { id: ruleId },
          data: {
              eventType: data.eventType,
              description: data.description,
              isActive: data.isActive,
          },
          include: { lines: true }
      });
      return res as unknown as FinancePostingRule;
  }
}
