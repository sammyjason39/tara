import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService, DomainEvent } from '../../shared/events/event-bus.service';
import { ITService } from './it.service';
import { WebhookService } from './webhook.service';

@Injectable()
export class ITEventHandler implements OnModuleInit {
  private readonly logger = new Logger(ITEventHandler.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly itService: ITService,
    private readonly webhookService: WebhookService,
  ) {}

  onModuleInit() {
    this.logger.log('IT Event Handler initialized. Subscribing to events...');
    this.eventBus.subscribe('*', 'ITEventHandler.handle', (event: DomainEvent) => this.handleEvent(event));
  }

  private async handleEvent(event: DomainEvent) {
    switch (event.event_type) {
      case 'candidate.hired':
        await this.handleCandidateHired(event);
        break;
      case 'employee.suspended':
        await this.handleEmployeeSuspended(event);
        break;
      case 'employee.terminated':
        await this.handleEmployeeTerminated(event);
        break;
      default:
        // Ignore other events
        break;
    }
  }

  private async handleCandidateHired(event: DomainEvent) {
    this.logger.log(`Handling candidate.hired for tenant ${event.tenant_id}, entity ${event.entity_id}`);
    
    const { payload } = event;
    const employee_id = event.entity_id;

    try {
      await this.itService.createProvisioningRequest(
        { tenant_id: event.tenant_id },
        {
        employee_id: employee_id,
        type: 'ACCOUNT_CREATION',
        scope: 'full_portal' as any,
        reason: 'NEW_HIRE',
        priority: 'HIGH',
        description: `Auto-provisioning for new hire: ${payload.fullName || 'New Employee'}. Role: ${payload.roleTitle || 'N/A'}.`,
        metadata: {
          fullName: payload.fullName,
          email: payload.email,
          roleTitle: payload.roleTitle,
          departmentId: payload.departmentId,
          source: 'HR_AUTO_EVENT'
        }
      }, 'SYSTEM_EVENT_BUS');
      
      this.logger.log(`Provisioning request created for employee ${employee_id}`);

      // SaaS Provisioning (e.g., Slack)
      await this.webhookService.dispatch(
        "https://api.zenvix.io/hooks/saas/provision",
        {
          action: "ACTIVATE",
          service: "SLACK",
          employee_id,
          email: payload.email,
          fullName: payload.fullName,
        },
        event.tenant_id
      );
    } catch (error) {
      this.logger.error(`Failed to handle candidate hired automation: ${error.message}`);
    }
  }

  private async handleEmployeeSuspended(event: DomainEvent) {
    this.logger.log(`Handling employee.suspended for tenant ${event.tenant_id}, entity ${event.entity_id}`);
    
    const { payload } = event;
    const employee_id = event.entity_id;

    try {
      await this.itService.createProvisioningRequest(
        { tenant_id: event.tenant_id },
        {
        employee_id: employee_id,
        type: 'ACCESS_REVOCATION',
        scope: 'full_portal' as any,
        reason: 'SUSPENSION',
        priority: 'URGENT',
        description: `Emergency access revocation for suspended employee: ${payload.fullName || 'N/A'}. Reason: ${payload.reason || 'No reason provided'}.`,
        metadata: {
          fullName: payload.fullName,
          email: payload.email,
          reason: payload.reason,
          source: 'HR_AUTO_EVENT'
        }
      }, 'SYSTEM_EVENT_BUS');
      
      this.logger.log(`Access revocation request created for employee ${employee_id}`);

      // SaaS Revocation
      await this.webhookService.dispatch(
        "https://api.zenvix.io/hooks/saas/revoke",
        {
          action: "DEACTIVATE",
          employee_id,
          email: payload.email,
          reason: payload.reason,
        },
        event.tenant_id
      );
    } catch (error) {
      this.logger.error(`Failed to handle employee suspended automation: ${error.message}`);
    }
  }

  private async handleEmployeeTerminated(event: DomainEvent) {
    this.logger.log(`Handling employee.terminated for tenant ${event.tenant_id}, entity ${event.entity_id}`);
    
    const { payload } = event;
    const employee_id = event.entity_id;

    try {
      await this.itService.createProvisioningRequest(
        { tenant_id: event.tenant_id },
        {
        employee_id: employee_id,
        type: 'ACCESS_REVOCATION',
        scope: 'full_portal' as any,
        reason: 'TERMINATION',
        priority: 'HIGH',
        description: `Access revocation for terminated employee: ${payload.fullName || 'N/A'}. Reason: ${payload.reason || 'Deactivated'}.`,
        metadata: {
          fullName: payload.fullName,
          email: payload.email,
          reason: payload.reason,
          source: 'HR_AUTO_EVENT'
        }
      }, 'SYSTEM_EVENT_BUS');
      
      this.logger.log(`Access revocation request created for terminated employee ${employee_id}`);

      // SaaS Revocation
      await this.webhookService.dispatch(
        "https://api.zenvix.io/hooks/saas/revoke",
        {
          action: "TERMINATE",
          employee_id,
          email: payload.email,
          reason: payload.reason,
        },
        event.tenant_id
      );
    } catch (error) {
      this.logger.error(`Failed to handle employee terminated automation: ${error.message}`);
    }
  }
}
