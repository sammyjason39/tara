import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { FinanceService } from '../finance.service';

@Injectable()
export class PayrollSettlementListener implements OnModuleInit {
  private readonly logger = new Logger(PayrollSettlementListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly financeService: FinanceService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('HR.PAYROLL_SETTLED', 'FinancePayrollListener_HR', async (event: any) => {
      this.logger.log(`[PayrollSettlementListener] Received settlement for run ${event.entity_id}`);
      
      try {
        await this.financeService.finalizePayrollSettlement(
          event.tenant_id,
          event.entity_id!,
          event.payload
        );
      } catch (error) {
        this.logger.error(`Failed to handle payroll settlement: ${error.message}`);
      }
    });

    // Handle standard naming if different
    this.eventBus.subscribe('PAYROLL_SETTLED', 'FinancePayrollListener_ST', async (event: any) => {
      this.logger.log(`[PayrollSettlementListener] Received settlement for run ${event.entity_id}`);
      
      try {
        await this.financeService.finalizePayrollSettlement(
          event.tenant_id,
          event.entity_id!,
          event.payload
        );
      } catch (error) {
        this.logger.error(`Failed to handle payroll settlement: ${error.message}`);
      }
    });
  }
}
