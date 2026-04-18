import { Injectable, Logger } from '@nestjs/common';
import { IProcurementWorkflow } from './procurement-workflow.interface';
import { Requisition } from '../entities/requisition.entity';
import { PrismaService } from '../../../persistence/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { IProcurementRepository } from '../repositories/procurement.repository.interface';

@Injectable()
export class BiddingWorkflow implements IProcurementWorkflow {
  private readonly logger = new Logger(BiddingWorkflow.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: IProcurementRepository,
  ) {}

  getMode(): 'DIRECT' | 'BIDDING' {
    return 'BIDDING';
  }

  async processApprovedRequisitions(requisition: Requisition): Promise<void> {
    this.logger.log(`Processing BIDDING procurement for requisition: ${requisition.id}`);

    // Create a Sourcing Event (RFQ)
    const event = await this.prisma.procurement_sourcing_events.create({
      data: {
        id: uuidv4(),
        tenant_id: requisition.tenant_id,
        requisition_id: requisition.id,
        status: 'OPEN',
        bid_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          title: `RFQ: ${requisition.title}`,
          type: 'RFQ',
          currency: requisition.currency as string || 'IDR'
        } as any
      },
    });

    // Mark requisition as SOURCING
    await this.prisma.procurement_requisitions.update({
      where: { id: requisition.id },
      data: { status: 'SOURCING' },
    });

    await this.repository.createAuditEvent(
      requisition.tenant_id,
      'system',
      'SOURCING_EVENT_CREATED',
      'sourcing_event',
      event.id,
      `Requisition ${requisition.id} moved to Bidding mode (RFQ Created).`
    );
  }
}
