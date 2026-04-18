import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { AuditService } from '../../../shared/audit/audit.service';
import { FinanceChartOfAccount } from '../domain/finance.interfaces';
import { IChartOfAccountRepository } from '../repositories/interfaces/coa.repository.interface';
import { IPostingRuleRepository } from '../repositories/interfaces/posting-rule.repository.interface';
import { AccountType, NormalBalance } from '../domain/finance.constants';

@Injectable()
export class ChartOfAccountService {
  constructor(
    @Inject('IChartOfAccountRepository')
    private readonly coaRepo: IChartOfAccountRepository,
    @Inject('IPostingRuleRepository')
    private readonly ruleRepo: IPostingRuleRepository,
    private readonly auditService: AuditService,
  ) {}

  async getHierarchy(tenant_id: string, company_id: string): Promise<FinanceChartOfAccount[]> {
    return this.coaRepo.findAll(tenant_id, company_id);
  }

  async getAccount(tenant_id: string, company_id: string, id: string): Promise<FinanceChartOfAccount> {
    const coa = await this.coaRepo.findById(tenant_id, company_id, id);
    if (!coa) throw new BadRequestException('Account not found');
    return coa;
  }

  async createAccount(tenant_id: string, company_id: string, data: any, user_id: string): Promise<FinanceChartOfAccount> {
    let parent;
    if (data.parentAccountId) {
      parent = await this.coaRepo.findById(tenant_id, company_id, data.parentAccountId);
      if (!parent) throw new BadRequestException('Parent account not found');
    }

    const accountLevel = parent ? parent.accountLevel + 1 : 1;
    const accountPath = parent ? parent.accountPath + `.${data.accountCode}` : data.accountCode;

    const coa = await this.coaRepo.create(tenant_id, company_id, {
      ...data,
      accountLevel,
      accountPath,
    });

    await this.auditService.log({
      tenant_id,
      user_id,
      module: 'FINANCE',
      action: 'CREATE_COA',
      entity_type: 'ChartOfAccount',
      entity_id: coa.id,
      after_state: coa,
      metadata: { company_id },
    });

    return coa;
  }

  async updateAccount(tenant_id: string, company_id: string, id: string, data: any, user_id?: string): Promise<FinanceChartOfAccount> {
    const existing = await this.coaRepo.findById(tenant_id, company_id, id);
    if (!existing) throw new BadRequestException('Account not found');

    const inUse = await this.coaRepo.checkInUse(tenant_id, company_id, id);
    const referencedByRule = await this.isReferencedByPostingRule(tenant_id, company_id, id);
    
    if (inUse || referencedByRule) {
      if (data.parentAccountId !== undefined && data.parentAccountId !== existing.parentAccountId) {
        throw new BadRequestException('Account is referenced and parent cannot be modified');
      }
      if (data.accountType !== undefined && data.accountType !== existing.accountType) {
        throw new BadRequestException('Account is referenced and type cannot be modified');
      }
    }

    const coa = await this.coaRepo.update(tenant_id, company_id, id, data);

    await this.auditService.log({
      tenant_id,
      user_id: user_id || 'SYSTEM',
      module: 'FINANCE',
      action: 'UPDATE_COA',
      entity_type: 'ChartOfAccount',
      entity_id: id,
      before_state: existing,
      after_state: coa,
      metadata: { company_id, updates: data },
    });

    return coa;
  }

  async deleteAccount(tenant_id: string, company_id: string, id: string, user_id: string): Promise<void> {
    const existing = await this.coaRepo.findById(tenant_id, company_id, id);
    if (!existing) throw new BadRequestException('Account not found');

    const inUse = await this.coaRepo.checkInUse(tenant_id, company_id, id);
    const referencedByRule = await this.isReferencedByPostingRule(tenant_id, company_id, id);

    if (inUse || referencedByRule) {
      throw new BadRequestException('Account is referenced and cannot be deleted');
    }

    await this.coaRepo.delete(tenant_id, company_id, id);

    await this.auditService.log({
      tenant_id,
      user_id,
      module: 'FINANCE',
      action: 'DELETE_COA',
      entity_type: 'ChartOfAccount',
      entity_id: id,
      before_state: existing,
      metadata: { company_id },
    });
  }

  private async isReferencedByPostingRule(tenant_id: string, company_id: string, accountId: string): Promise<boolean> {
    const rules = await this.ruleRepo.listRules(tenant_id, company_id);
    return rules.some(rule => rule.lines.some((line: any) => line.accountId === accountId));
  }
}
