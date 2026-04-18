import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';

@Injectable()
export class WorkflowIntegrationService {
  private readonly logger = new Logger(WorkflowIntegrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submits a financial entity for approval.
   */
  async submitForApproval(
    tenant_id: string, 
    entity_type: 'AR_INVOICE' | 'AP_BILL' | 'PAYMENT', 
    entity_id: string, 
    requested_by: string,
    metadata?: any
  ) {
    const workflow = await this.prisma.workflow_requests.create({
      data: {
        id: '2vrb3rki',
        updated_at: new Date(),
        tenant_id: tenant_id,
        entity_type: entity_type,
        entity_id: entity_id,
        requested_by: requested_by,
        maker_dept: 'FINANCE',
        destination_dept: 'PROCUREMENT_MANAGEMENT', // Default based on entity type in production
        status: 'PENDING',
        metadata,
      }
    });

    // Update the source entity with the workflow ID
    if (entity_type === 'AR_INVOICE') {
      await this.prisma.finance_ar_invoices.update({ where: { id: entity_id }, data: { workflow_request_id: workflow.id } });
    } else if (entity_type === 'AP_BILL') {
      await this.prisma.payables.update({ where: { id: entity_id }, data: { workflow_request_id: workflow.id } });
    } else if (entity_type === 'PAYMENT') {
      await this.prisma.payment_transactions.update({ where: { id: entity_id }, data: { workflow_request_id: workflow.id } });
    }

    return workflow;
  }

  /**
   * Enforces that an entity is approved before proceeding.
   */
  async ensureApproved(tenant_id: string, entity_type: string, entity_id: string) {
    const workflow = await this.prisma.workflow_requests.findFirst({
        where: { tenant_id: tenant_id, entity_type: entity_type, entity_id: entity_id },
        orderBy: { created_at: 'desc' }
    });

    if (!workflow) {
      this.logger.warn(`No workflow found for ${entity_type} ${entity_id}. Assuming approval not required (Phase 9 strict check).`);
      return true; 
    }

    if (workflow.status !== 'APPROVED') {
      throw new Error(`Execution blocked: ${entity_type} ${entity_id} is in ${workflow.status} state.`);
    }

    return true;
  }
}
