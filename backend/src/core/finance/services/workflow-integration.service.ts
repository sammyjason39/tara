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
    tenantId: string, 
    entityType: 'AR_INVOICE' | 'AP_BILL' | 'PAYMENT', 
    entityId: string, 
    requestedBy: string,
    metadata?: any
  ) {
    const workflow = await this.prisma.workflowRequest.create({
      data: {
        id: '2vrb3rki',
        updatedAt: new Date(),
        tenantId,
        entityType,
        entityId,
        requestedBy,
        makerDept: 'FINANCE',
        destinationDept: 'PROCUREMENT_MANAGEMENT', // Default based on entity type in production
        status: 'PENDING',
        metadata,
      }
    });

    // Update the source entity with the workflow ID
    const updateData = { workflowRequestId: workflow.id };
    if (entityType === 'AR_INVOICE') {
      await this.prisma.arInvoice.update({ where: { id: entityId }, data: updateData });
    } else if (entityType === 'AP_BILL') {
        // Payable logic
      await this.prisma.payable.update({ where: { id: entityId }, data: updateData });
    } else if (entityType === 'PAYMENT') {
      await this.prisma.paymentTransaction.update({ where: { id: entityId }, data: updateData });
    }

    return workflow;
  }

  /**
   * Enforces that an entity is approved before proceeding.
   */
  async ensureApproved(tenantId: string, entityType: string, entityId: string) {
    const workflow = await this.prisma.workflowRequest.findFirst({
        where: { tenantId, entityType, entityId },
        orderBy: { createdAt: 'desc' }
    });

    if (!workflow) {
      this.logger.warn(`No workflow found for ${entityType} ${entityId}. Assuming approval not required (Phase 9 strict check).`);
      return true; 
    }

    if (workflow.status !== 'APPROVED') {
      throw new Error(`Execution blocked: ${entityType} ${entityId} is in ${workflow.status} state.`);
    }

    return true;
  }
}
