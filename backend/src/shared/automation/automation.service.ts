import { Injectable, OnModuleInit } from "@nestjs/common";
import { EventBusService, DomainEvent } from "../events/event-bus.service";
import { LoggerService } from "../logger/logger.service";
import { AuditService } from "../audit/audit.service";

export interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  eventPattern: string; // e.g., "HR.EMPLOYEE_CREATED", "HR.*"
  condition?: any;      // JSON logic or simple equality
  actionType: "WEBHOOK" | "NOTIFICATION" | "EMAIL" | "TASK_CREATE" | "AI_ANALYZE";
  actionConfig: any;
  enabled: boolean;
}

/**
 * Zenvix Automation Engine
 * Reacts to Domain Events by executing configured rules
 */
@Injectable()
export class AutomationService implements OnModuleInit {
  private rules: AutomationRule[] = []; // In-memory cache for fast matching

  constructor(
    private readonly eventBus: EventBusService,
    private readonly logger: LoggerService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    this.logger.log({
      tenant_id: "SYSTEM",
      module: "AUTOMATION",
      level: "INFO",
      event: "ENGINE_STARTED",
      message: "Zenvix Global Event Fabric Automation Engine Initialized",
    });

    // Subscribe to ALL events
    (this.eventBus as any).subscribe("*", "AutomationService.audit", async (event: any) => {
      await this.processEvent(event);
    });

    // Mock initial rules for demonstration
    this.loadMockRules();
  }

  private loadMockRules() {
    this.rules = [
      {
        id: "rule-1",
        tenant_id: "zenvix-corp",
        name: "New Employee Onboarding Alert",
        eventPattern: "HR.EMPLOYEE_CREATED",
        actionType: "NOTIFICATION",
        actionConfig: { channel: "admin-slack", message: "Welcome our new joiner!" },
        enabled: true,
      },
      {
        id: "rule-2",
        tenant_id: "zenvix-corp",
        name: "Security Alert: High Manual Adjustment",
        eventPattern: "HR.PAYROLL_CALCULATED",
        condition: { field: "total_amount", gt: 100000000 }, // > 100M
        actionType: "AI_ANALYZE",
        actionConfig: { prompt: "Analyze this high payroll for anomalies." },
        enabled: true,
      }
    ];
  }

  private async processEvent(event: DomainEvent) {
    // 1. Find matching rules
    const matches = this.rules.filter(rule => 
      rule.enabled && 
      rule.tenant_id === event.tenant_id && 
      this.matchesPattern(event.event_type, rule.eventPattern)
    );

    for (const rule of matches) {
      if (this.evaluateCondition(event, rule)) {
        await this.executeAction(event, rule);
      }
    }
  }

  private matchesPattern(event_type: string, pattern: string): boolean {
    if (pattern === "*") return true;
    if (pattern.endsWith("*")) {
      return event_type.startsWith(pattern.slice(0, -1));
    }
    return event_type === pattern;
  }

  private evaluateCondition(event: DomainEvent, rule: AutomationRule): boolean {
    if (!rule.condition) return true;
    
    const { field, gt, eq } = rule.condition;
    const value = event.payload?.[field];

    if (gt !== undefined && value > gt) return true;
    if (eq !== undefined && value === eq) return true;
    
    return false;
  }

  private async executeAction(event: DomainEvent, rule: AutomationRule) {
    this.logger.log({
      tenant_id: event.tenant_id,
      module: "AUTOMATION",
      level: "INFO",
      event: "RULE_TRIGGERED",
      message: `Automation rule '${rule.name}' triggered by ${event.event_type}`,
      payload: { ruleId: rule.id },
      user_id: event.user_id,
    });

    // In a real system, this would call specific service handlers
    this.logger.log({
      tenant_id: event.tenant_id,
      module: "AUTOMATION",
      level: "INFO",
      event: "ACTION_EXECUTED",
      message: `Executed ${rule.actionType} for rule ${rule.name}`,
    });

    // Log to Audit for compliance
    await this.audit.log({
      tenant_id: event.tenant_id,
      user_id: "SYSTEM_AUTO",
      module: "AUTOMATION",
      action: "EXECUTE",
      entity_type: "AUTOMATION_RULE",
      entity_id: rule.id,
      metadata: { actionType: rule.actionType },
    }, (event as any).tx);
  }

  /**
   * Visibility: Manually trigger the automation engine with a custom event.
   */
  async triggerManual(tenant_id: string, data: { event_type: string, payload: any }, user_id: string) {
    const event: DomainEvent = {
      event_type: data.event_type,
      tenant_id,
      entity_id: 'manual-trigger',
      entity_type: 'MANUAL',
      source_module: 'ADMIN_WORKFLOW',
      payload: data.payload,
      user_id,
      created_at: new Date()
    };

    await this.processEvent(event);
    return { success: true, message: `Automation loop triggered for ${data.event_type}` };
  }
}
