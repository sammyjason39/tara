import { Injectable, Logger } from '@nestjs/common';
import { EventBusService, DomainEvent } from '../../../../shared/events/event-bus.service';
import { EVENT_NAMES } from '../../events/event-names';

@Injectable()
export class EmployeeCreatedListener {
  private readonly logger = new Logger(EmployeeCreatedListener.name);

  constructor(private readonly eventBus: EventBusService) {}

  register() {
    this.eventBus.subscribe(EVENT_NAMES.EMPLOYEE_CREATED, 'EmployeeCreatedListener.handle', this.handle.bind(this));
  }

  private async handle(event: DomainEvent) {
    if (event.event_type !== EVENT_NAMES.EMPLOYEE_CREATED) return;

    this.logger.log(`[Automation] Triggered for ${event.event_type} on entity ${event.entity_id}`);

    // Action 1: IT Provisioning
    await this.provisionITRecords(event);
    
    // Action 2: Payroll Profile Creation
    await this.createPayrollProfile(event);
    
    // Action 3: Compliance Registration
    await this.registerCompliance(event);
  }

  private async provisionITRecords(event: DomainEvent) {
    this.logger.log(`→ Action: IT Provisioning (Azure AD / Workspace) for ${event.entity_id}`);
    // DEV_MOCK_MODE: Simulate external API call
    return Promise.resolve();
  }

  private async createPayrollProfile(event: DomainEvent) {
    this.logger.log(`→ Action: Payroll profile creation for ${event.entity_id}`);
    // DEV_MOCK_MODE: Simulate internal service call
    return Promise.resolve();
  }

  private async registerCompliance(event: DomainEvent) {
    this.logger.log(`→ Action: Compliance registration for ${event.entity_id}`);
    // DEV_MOCK_MODE: Simulate rule engine assignment
    return Promise.resolve();
  }
}
