import { Injectable } from '@nestjs/common';
import { IntercompanyEliminationRule } from '../domain/finance.interfaces';
import { IIntercompanyEliminationRepository } from './interfaces/intercompany-elimination.repository.interface';

@Injectable()
export class IntercompanyEliminationMockRepository implements IIntercompanyEliminationRepository {
  private rules: Map<string, IntercompanyEliminationRule[]> = new Map();

  async listRules(tenant_id: string): Promise<IntercompanyEliminationRule[]> {
    return this.rules.get(tenant_id) || [];
  }

  async findByCompanies(tenant_id: string, companyA: string, companyB: string): Promise<IntercompanyEliminationRule | null> {
    const list = this.rules.get(tenant_id) || [];
    return list.find((r: any) => 
      (r.companyA === companyA && r.companyB === companyB) ||
      (r.companyA === companyB && r.companyB === companyA)
    ) || null;
  }

  async createRule(tenant_id: string, data: Partial<IntercompanyEliminationRule>): Promise<IntercompanyEliminationRule> {
    const list = this.rules.get(tenant_id) || [];
    const newRule: IntercompanyEliminationRule = {
      id: Math.random().toString(36).substr(2, 9),
      tenant_id,
      companyA: data.companyA || '',
      companyB: data.companyB || '',
      accountMapping: data.accountMapping || {},
      isActive: data.isActive !== false,
      updated_at: new Date(),
    };
    list.push(newRule);
    this.rules.set(tenant_id, list);
    return newRule;
  }

  async updateRule(tenant_id: string, id: string, data: Partial<IntercompanyEliminationRule>): Promise<IntercompanyEliminationRule> {
    const list = this.rules.get(tenant_id) || [];
    const index = list.findIndex((r: any) => r.id === id);
    if (index === -1) throw new Error('Rule not found');

    list[index] = { ...list[index], ...data, updated_at: new Date() };
    this.rules.set(tenant_id, list);
    return list[index];
  }

  async deleteRule(tenant_id: string, id: string): Promise<void> {
    const list = this.rules.get(tenant_id) || [];
    const index = list.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      list.splice(index, 1);
      this.rules.set(tenant_id, list);
    }
  }
}
