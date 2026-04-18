import { Injectable, Logger } from '@nestjs/common';
import { IProcurementWorkflow } from './procurement-workflow.interface';
import { Requisition } from '../entities/requisition.entity';
import { ProcurementService } from '../procurement.service';
import { IProcurementRepository } from '../repositories/procurement.repository.interface';

@Injectable()
export class DirectWorkflow implements IProcurementWorkflow {
  private readonly logger = new Logger(DirectWorkflow.name);

  constructor(
    private readonly repository: IProcurementRepository,
    // Note: We use the repository directly to avoid circular dependency with ProcurementService if needed,
    // but ProcurementService usually orchestrates workflows.
  ) {}

  getMode(): 'DIRECT' | 'BIDDING' {
    return 'DIRECT';
  }

  async processApprovedRequisitions(requisition: Requisition): Promise<void> {
    this.logger.log(`Processing DIRECT procurement for requisition: ${requisition.id}`);
    
    // In Direct mode, we might auto-select a preferred supplier or wait for manual Draft PO creation.
    // Industry standard for 'DIRECT' is to flag it as 'READY_FOR_PO'.
    await this.repository.createAuditEvent(
        requisition.tenant_id,
        'system',
        'WORKFLOW_DIRECT_TRIGGERED',
        'requisition',
        requisition.id,
        'Direct procurement mode active. Requisition is ready for PO creation.'
    );
  }
}
