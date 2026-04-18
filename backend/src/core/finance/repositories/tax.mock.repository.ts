import { Injectable } from '@nestjs/common';
import { ITaxRepository, TaxConfig, TaxRule, TaxRate } from './interfaces/tax.repository.interface';
import { v4 as uuid } from 'uuid';

@Injectable()
export class TaxConfigMockRepository implements ITaxRepository {
  private configs: TaxConfig[] = [];
  private rules: TaxRule[] = [];

  async getConfig(tenant_id: string, branch_id?: string): Promise<TaxConfig | null> {
    return this.configs.find((c: any) => c.tenant_id === tenant_id && (c.branch_id === branch_id || (!c.branch_id && !branch_id))) || null;
  }

  async getRules(taxConfigId: string): Promise<TaxRule[]> {
    return this.rules.filter((r: any) => r.taxConfigId === taxConfigId).sort((a,b) => a.priority - b.priority);
  }

  async saveConfig(config: Partial<TaxConfig>): Promise<TaxConfig> {
    const existingIndex = this.configs.findIndex((c: any) => c.tenant_id === config.tenant_id && c.branch_id === config.branch_id);
    if (existingIndex >= 0) {
      this.configs[existingIndex] = { ...this.configs[existingIndex], ...config } as TaxConfig;
      return this.configs[existingIndex];
    }
    const newConfig = {
      id: uuid(),
      tenant_id: config.tenant_id!,
      branch_id: config.branch_id,
      country: config.country || 'ID',
      currency: config.currency || 'IDR',
      isEnabled: config.isEnabled ?? true,
    };
    this.configs.push(newConfig);
    return newConfig;
  }

  async saveRule(rule: Partial<TaxRule>): Promise<TaxRule> {
    const existingIndex = this.rules.findIndex((r: any) => r.id === rule.id);
    if (existingIndex >= 0) {
        this.rules[existingIndex] = { ...this.rules[existingIndex], ...rule } as TaxRule;
        return this.rules[existingIndex];
    }
    const newRule: TaxRule = {
        id: uuid(),
        taxConfigId: rule.taxConfigId!,
        name: rule.name!,
        description: rule.description,
        priority: rule.priority || 0,
        conditions: rule.conditions || {},
        rates: rule.rates || []
    };
    this.rules.push(newRule);
    return newRule;
  }

  async saveRate(rate: Partial<TaxRate>): Promise<TaxRate> {
    const rule = this.rules.find((r: any) => r.id === rate.taxRuleId);
    if (!rule) throw new Error('Rule not found');

    const newRate: TaxRate = {
        id: uuid(),
        taxRuleId: rate.taxRuleId!,
        name: rate.name!,
        rate: rate.rate || 0,
        type: rate.type || 'PERCENTAGE',
        isInclusive: rate.isInclusive ?? false,
        accountCode: rate.accountCode!
    };
    rule.rates.push(newRate);
    return newRate;
  }
}
