import { Injectable, Logger } from '@nestjs/common';
import { EventBusService, DomainEvent } from '../../../../shared/events/event-bus.service';
import { EVENT_NAMES } from '../../events/event-names';
import { CommandBusService } from '../../../../shared/command-bus/command-bus.service';
import { HR_COMMAND_NAMES } from '../../commands/hr.commands';

@Injectable()
export class PayrollExecutedListener {
  private readonly logger = new Logger(PayrollExecutedListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly commandBus: CommandBusService,
  ) {}

  register() {
    this.eventBus.subscribe(EVENT_NAMES.PAYROLL_EXECUTED, 'PayrollExecutedListener.handle', this.handle.bind(this));
  }

  private async handle(event: DomainEvent) {
    if (event.event_type !== EVENT_NAMES.PAYROLL_EXECUTED) return;

    this.logger.log(`[Automation] Triggered for ${event.event_type} on entity ${event.entity_id}`);

    // Action 1: Compliance Calculation
    await this.triggerComplianceCalculation(event);
    
    // Action 2: Government Report Generation
    await this.triggerReportGeneration(event);
  }

  private async triggerComplianceCalculation(event: DomainEvent) {
    this.logger.log(`→ Action: Initiating Compliance Calculation routines for ${event.payload.period}`);
    // Actually, ExecutePayrollCommandHandler now does this inline. But we could also queue it asynchronously here.
    return Promise.resolve();
  }

  private async triggerReportGeneration(event: DomainEvent) {
    this.logger.log(`→ Action: Queueing Government Report Generation via CommandBus`);
    
    // Example of event-to-command automation choreography
    try {
      await this.commandBus.execute(HR_COMMAND_NAMES.GENERATE_COMPLIANCE_REPORT, {
        commandId: `auto-${Date.now()}`,
        tenant_id: event.tenant_id,
        actor_id: 'SYSTEM_AUTOMATION',
        timestamp: new Date(),
        payload: {
          country: 'ID',
          module: 'BPJS_KESEHATAN',
          period: event.payload.period,
          format: 'CSV'
        }
      });
    } catch (err: any) {
      this.logger.warn(`Failed to auto-generate report: ${err.message}`);
    }
  }
}
