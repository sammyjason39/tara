import { Prisma } from '@prisma/client';

export interface TaxConfig {
  id: string;
  tenant_id: string;
  branch_id?: string;
  country: string;
  currency: string;
  isEnabled: boolean;
}

export interface TaxRate {
  id: string;
  taxRuleId: string;
  name: string;
  rate: number;
  type: string;
  isInclusive: boolean;
  accountCode: string;
}

export interface TaxRule {
  id: string;
  taxConfigId: string;
  name: string;
  description?: string;
  priority: number;
  conditions: any;
  rates: TaxRate[];
}

export interface ITaxRepository {
  getConfig(tenant_id: string, branch_id?: string): Promise<TaxConfig | null>;
  getRules(taxConfigId: string): Promise<TaxRule[]>;
  saveConfig(config: Partial<TaxConfig>): Promise<TaxConfig>;
  saveRule(rule: Partial<TaxRule>): Promise<TaxRule>;
  saveRate(rate: Partial<TaxRate>): Promise<TaxRate>;
}
