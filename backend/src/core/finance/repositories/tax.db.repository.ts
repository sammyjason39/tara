import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { ITaxRepository, TaxConfig, TaxRule, TaxRate } from './interfaces/tax.repository.interface';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';

@Injectable()
export class TaxConfigDbRepository implements ITaxRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService | Prisma.TransactionClient
  ) {}

  private get db(): Prisma.TransactionClient {
    if (this.prisma instanceof PrismaService) {
        return this.prisma as any;
    }
    return this.prisma as Prisma.TransactionClient;
  }

  async getConfig(tenant_id: string, branch_id?: string): Promise<TaxConfig | null> {
    // If findUnique is being difficult with nulls in compound keys, we use findFirst
    const config = await this.db.finance_tax_configs.findFirst({
      where: {
          tenant_id: tenant_id,
          branch_id: branch_id || null,
      },
    });

    if (!config) return null;

    return {
      id: config.id,
      tenant_id: config.tenant_id,
      branch_id: config.branch_id || undefined,
      country: config.country,
      currency: config.currency,
      isEnabled: config.is_enabled,
    };
  }

  async getRules(taxConfigId: string): Promise<TaxRule[]> {
    const rules = await this.db.finance_tax_rules.findMany({
      where: { tax_config_id: taxConfigId },
      include: {
        finance_tax_rates: true,
      },
      orderBy: { priority: 'asc' },
    });

    return rules.map((r: any) => ({
      id: r.id,
      taxConfigId: r.tax_config_id,
      name: r.name,
      description: r.description || undefined,
      priority: r.priority,
      conditions: r.conditions,
      rates: r.finance_tax_rates.map((rate: any) => ({
        id: rate.id,
        taxRuleId: rate.tax_rule_id,
        name: rate.name,
        rate: Number(rate.rate),
        type: rate.type,
        isInclusive: rate.is_inclusive,
        accountCode: rate.account_code,
      })),
    }));
  }

  async saveConfig(config: Partial<TaxConfig>): Promise<TaxConfig> {
    const data = {
        tenant_id: config.tenant_id!,
        branch_id: config.branch_id || null,
        country: config.country || 'ID',
        currency: config.currency || 'IDR',
        isEnabled: config.isEnabled ?? true,
    };

    // Use findFirst + Create/Update instead of upsert for compound keys with nulls if needed,
    // but here we try to fix the upsert's where clause.
    const existing = await this.db.finance_tax_configs.findFirst({
        where: { tenant_id: data.tenant_id, branch_id: data.branch_id }
    });

    let saved;
    if (existing) {
        saved = await this.db.finance_tax_configs.update({
            where: { id: existing.id },
            data
        });
    } else {
        saved = await this.db.finance_tax_configs.create({
            data: {
                id: config.id || uuid(),
                ...data
            }
        });
    }

    return {
      id: saved.id,
      tenant_id: saved.tenant_id,
      branch_id: saved.branch_id || undefined,
      country: saved.country,
      currency: saved.currency,
      isEnabled: saved.is_enabled,
    };
  }

  async saveRule(rule: Partial<TaxRule>): Promise<TaxRule> {
    const saved = await this.db.finance_tax_rules.upsert({
      where: { id: rule.id || uuid() },
      update: {
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        conditions: rule.conditions || Prisma.DbNull,
      },
      create: {
        id: rule.id || uuid(),
        tax_config_id: rule.taxConfigId!,
        name: rule.name!,
        description: rule.description,
        priority: rule.priority || 0,
        conditions: rule.conditions || {},
      },
      include: { finance_tax_rates: true }
    });

    return {
        id: saved.id,
        taxConfigId: saved.tax_config_id,
        name: saved.name,
        description: saved.description || undefined,
        priority: saved.priority,
        conditions: saved.conditions,
        rates: saved.finance_tax_rates.map((r: any) => ({
            id: r.id,
            taxRuleId: r.tax_rule_id,
            name: r.name,
            rate: Number(r.rate),
            type: r.type,
            isInclusive: r.is_inclusive,
            accountCode: r.account_code
        }))
    };
  }

  async saveRate(rate: Partial<TaxRate>): Promise<TaxRate> {
    const saved = await this.db.finance_tax_rates.upsert({
      where: { id: rate.id || uuid() },
      update: {
        name: rate.name,
        rate: rate.rate ? new Prisma.Decimal(rate.rate) : undefined,
        type: rate.type,
        is_inclusive: rate.isInclusive,
        account_code: rate.accountCode,
      },
      create: {
        id: rate.id || uuid(),
        tax_rule_id: rate.taxRuleId!,
        name: rate.name!,
        rate: new Prisma.Decimal(rate.rate || 0),
        type: rate.type || 'PERCENTAGE',
        is_inclusive: rate.isInclusive ?? false,
        account_code: rate.accountCode!,
      },
    });

    return {
        id: saved.id,
        taxRuleId: saved.tax_rule_id,
        name: saved.name,
        rate: Number(saved.rate),
        type: saved.type,
        isInclusive: saved.is_inclusive,
        accountCode: saved.account_code
    };
  }
}
