import { Injectable, Logger, Inject } from '@nestjs/common';
import { IFnbRepository, Recipe } from './repositories/interfaces/fnb.repository.interface';
import { AuditService } from '../../shared/audit/audit.service';

@Injectable()
export class FnbService {
  private readonly logger = new Logger(FnbService.name);

  constructor(
    @Inject('IFnbRepository')
    private readonly repository: IFnbRepository,
    private readonly audit: AuditService,
  ) {}

  async getAllRecipes(tenant_id: string): Promise<Recipe[]> {
    return this.repository.getRecipes(tenant_id);
  }

  async auditProduction(tenant_id: string, recipeId: string, yieldQty: number, forensic?: { ip?: string, device_model?: string }): Promise<void> {
    this.logger.log(`Auditing production execution for recipe ${recipeId}`);
    
    // 1. Operational Deduction
    await this.repository.deductIngredients(tenant_id, recipeId, yieldQty);

    // 2. Forensic Log
    await this.audit.log({
      tenant_id,
      user_id: 'FNB_OPERATOR',
      module: 'FNB',
      action: 'PRODUCTION_EXECUTION',
      entity_type: 'RECIPE',
      entity_id: recipeId,
      severity: 'INFO',
      ip_address: forensic?.ip,
      device_model: forensic?.device_model,
      metadata: {
        yieldQuantity: yieldQty,
        timestamp: new Date().toISOString()
      }
    });
  }

  async getDynamicCost(tenant_id: string, recipeId: string) {
    return this.repository.calculateDynamicCost(tenant_id, recipeId);
  }
}
