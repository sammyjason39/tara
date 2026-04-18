import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IPostingRuleRepository } from './interfaces/posting-rule.repository.interface';
import { FinancePostingRule } from '../domain/finance.interfaces';
import { PostingRuleStatus } from '../domain/finance.constants';

@Injectable()
export class PostingRuleDbRepository implements IPostingRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRule(tenant_id: string, company_id: string, event_type: string): Promise<FinancePostingRule | null> {
    const res = await (this.prisma as any).ledgerPostingRule.findFirst({
      where: { tenant_id, event_type, isActive: true },
      include: { lines: true }
    });
    return res as unknown as FinancePostingRule;
  }

  async listRules(tenant_id: string, company_id: string): Promise<FinancePostingRule[]> {
    const list = await (this.prisma as any).ledgerPostingRule.findMany({
      where: { tenant_id },
      include: { lines: true }
    });
    return list as unknown as FinancePostingRule[];
  }

  async createRule(tenant_id: string, company_id: string, data: Partial<FinancePostingRule>): Promise<FinancePostingRule> {
    const res = await (this.prisma as any).ledgerPostingRule.create({
      data: {
        id: 'pc4wa5y9',
        updated_at: new Date(),
        tenant_id,
        company_id,
        event_type: data.event_type || '',
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

  async updateStatus(tenant_id: string, company_id: string, ruleId: string, status: PostingRuleStatus): Promise<FinancePostingRule> {
    const res = await (this.prisma as any).ledgerPostingRule.update({
      where: { id: ruleId },
      data: { status, isActive: status === PostingRuleStatus.ACTIVE },
      include: { lines: true }
    });
    return res as unknown as FinancePostingRule;
  }

  async findByEventType(tenant_id: string, company_id: string, event_type: string): Promise<FinancePostingRule[]> {
    const list = await (this.prisma as any).ledgerPostingRule.findMany({
      where: { tenant_id, event_type },
      include: { lines: true }
    });
    return list as unknown as FinancePostingRule[];
  }

  async update(tenant_id: string, company_id: string, ruleId: string, data: Partial<FinancePostingRule>): Promise<FinancePostingRule> {
      const res = await (this.prisma as any).ledgerPostingRule.update({
          where: { id: ruleId },
          data: {
              event_type: data.event_type,
              description: data.description,
              isActive: data.isActive,
          },
          include: { lines: true }
      });
      return res as unknown as FinancePostingRule;
  }
}
