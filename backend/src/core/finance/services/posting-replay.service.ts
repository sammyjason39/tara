import { Injectable, Logger } from '@nestjs/common';
import { PostingGatewayService } from './posting-gateway.service';
import { FinancialPostingRequest } from '../domain/posting-gateway.interfaces';

@Injectable()
export class PostingReplayService {
  private readonly logger = new Logger(PostingReplayService.name);

  constructor(private readonly gateway: PostingGatewayService) {}

  /**
   * Replays a specific financial event by its source ID.
   * Useful for recovery after bug fixes or configuration changes.
   */
  async replayEvent(source_module: string, sourceEventId: string): Promise<void> {
    this.logger.log(`Attempting replay for Event ${sourceEventId} from ${source_module}`);
    
    // In production, this would fetch the original request payload from Audit Logs or Source Database.
    const mockRequest: FinancialPostingRequest = {
        request_id: `REPLAY-${Date.now()}`,
        tenant_id: 'TENANT-001',
        company_id: 'COMP-001',
        source_module,
        sourceEventId, // Using the SAME ID will trigger Idempotency/Lock logic unless bypassed for manual replay
        event_type: 'SALES_COMPLETED',
        eventVersion: '1.0.0',
        schemaVersion: '2026-Q1',
        payload: { total: 100, fiscalPeriodId: '2026-03' },
        created_at: new Date(),
    };

    const result = await this.gateway.postEvent(mockRequest);
    this.logger.log(`Replay Result for ${sourceEventId}: ${result.status}`);
  }
}
