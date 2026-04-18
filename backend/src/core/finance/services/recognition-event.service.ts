import { Injectable, Logger } from '@nestjs/common';
import { RevRecSchedule, RecognitionPeriod } from '../domain/revrec.interfaces';
import { PostingGatewayService } from './posting-gateway.service';

@Injectable()
export class RecognitionEventService {
  private readonly logger = new Logger(RecognitionEventService.name);

  constructor(private readonly gateway: PostingGatewayService) {}

  /**
   * Triggers a periodic recognition posting for a specific period in a schedule.
   */
  async recognizePeriod(schedule: RevRecSchedule, periodIndex: number): Promise<void> {
    const period = schedule.periods[periodIndex];
    if (period.status === 'POSTED') return;

    this.logger.log(`Recognizing revenue for Schedule ${schedule.id}, Period ${period.date.toISOString()}`);

    const postingRequest = {
        request_id: `REVREC-${schedule.id}-${periodIndex}`,
        tenant_id: schedule.tenant_id,
        company_id: schedule.company_id,
        source_module: 'REVENUE_RECOGNITION',
        sourceEventId: `${schedule.id}-${periodIndex}`,
        event_type: 'REVENUE_RECOGNIZED',
        eventVersion: '1.0.0',
        schemaVersion: '2026-Q1',
        payload: {
          scheduleId: schedule.id,
          amount: period.amount,
          currency: schedule.currency,
          deferredAccountId: schedule.deferredAccountId,
          revenueAccountId: schedule.revenueAccountId,
          fiscalPeriodId: `${period.date.getFullYear()}-${(period.date.getMonth() + 1).toString().padStart(2, '0')}`,
        },
        created_at: new Date(),
    };

    const result = await this.gateway.postEvent(postingRequest as any);
    
    if (result.status === 'POSTED') {
      period.status = 'POSTED';
      this.logger.log(`Revenue recognized for period ${periodIndex}.`);
    } else {
      period.status = 'FAILED';
      this.logger.error(`Revenue recognition failed: ${result.errorMessage}`);
    }
  }
}
