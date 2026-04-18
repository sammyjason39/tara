import { Injectable } from '@nestjs/common';
import { IPostingRuleRepository } from './interfaces/posting-rule.repository.interface';
import { FinancePostingRule } from '../domain/finance.interfaces';
import { PostingRuleStatus } from '../domain/finance.constants';

@Injectable()
export class PostingRuleMockRepository implements IPostingRuleRepository {
  private rules: FinancePostingRule[] = [];

  async findRule(tenant_id: string, company_id: string, event_type: string): Promise<FinancePostingRule | null> {
    return this.rules.find((r: any) => r.tenant_id === tenant_id && r.company_id === company_id && r.event_type === event_type) || null;
  }

  async listRules(tenant_id: string, company_id: string): Promise<FinancePostingRule[]> {
    return this.rules.filter((r: any) => r.tenant_id === tenant_id && r.company_id === company_id);
  }

  async createRule(tenant_id: string, company_id: string, data: Partial<FinancePostingRule>): Promise<FinancePostingRule> {
    const newRule: FinancePostingRule = {
      id: Math.random().toString(36).substr(2, 9),
      tenant_id,
      company_id,
      event_type: data.event_type || '',
      description: data.description || '',
      isActive: true,
      lines: (data as any).lines || [],
      created_at: new Date(),
      updated_at: new Date(),
    } as any;
    this.rules.push(newRule);
    return newRule;
  }

  async updateStatus(tenant_id: string, company_id: string, ruleId: string, status: PostingRuleStatus): Promise<FinancePostingRule> {
    const index = this.rules.findIndex((r: any) => r.id === ruleId);
    if (index !== -1) {
      this.rules[index].isActive = status === PostingRuleStatus.ACTIVE;
      return this.rules[index];
    }
    throw new Error('Rule not found');
  }

  async findByEventType(tenant_id: string, company_id: string, event_type: string): Promise<FinancePostingRule[]> {
    return this.rules.filter((r: any) => r.tenant_id === tenant_id && r.company_id === company_id && r.event_type === event_type);
  }

  async update(tenant_id: string, company_id: string, ruleId: string, data: Partial<FinancePostingRule>): Promise<FinancePostingRule> {
    const index = this.rules.findIndex((r: any) => r.id === ruleId);
    if (index !== -1) {
       this.rules[index] = { ...this.rules[index], ...data };
       return this.rules[index];
    }
    throw new Error('Rule not found');
  }
}
