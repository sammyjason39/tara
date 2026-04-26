import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { EventBusService, DomainEvent } from "../../shared/events/event-bus.service";
import { PrismaService } from "../../persistence/prisma.service";
import { OmnichannelService } from "./omnichannel.service";
import { Customer360Service } from "./customer-360.service";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class MarketingAutomationEngine implements OnModuleInit {
  private readonly logger = new Logger(MarketingAutomationEngine.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly omnichannel: OmnichannelService,
    private readonly customer360: Customer360Service,
  ) {}

  async onModuleInit() {
    this.logger.log("Marketing Automation Engine Initializing...");
    
    // Subscribe to events that trigger marketing actions
    this.eventBus.subscribe("marketing.lead.created", "GrowthEngine.LeadTrigger", async (event) => {
      await this.handleLeadCreated(event);
    });

    this.eventBus.subscribe("retail.order.completed", "GrowthEngine.PurchaseTrigger", async (event) => {
      await this.handlePurchaseCompleted(event);
    });

    this.eventBus.subscribe("retail.cart.abandoned", "GrowthEngine.CartTrigger", async (event) => {
      await this.handleCartAbandoned(event);
    });
  }

  private async handleLeadCreated(event: DomainEvent) {
    this.logger.log(`Processing lead trigger for ${event.entity_id}`);
    
    const ctx = { tenant_id: event.tenant_id } as any;
    
    // 1. Ensure contact exists
    const contact = await this.customer360.syncContactFromEntity(ctx, "LEAD", event.entity_id);
    if (!contact) return;

    // 2. Find matching rules
    const rules = await this.prisma.marketing_automation_rules.findMany({
      where: {
        tenant_id: event.tenant_id,
        trigger_event: "marketing.lead.created",
        status: "ACTIVE",
      }
    });

    for (const rule of rules) {
      await this.executeRuleActions(ctx, rule, contact);
    }
  }

  private async handlePurchaseCompleted(event: DomainEvent) {
    this.logger.log(`Processing purchase trigger for ${event.entity_id}`);
    const ctx = { tenant_id: event.tenant_id } as any;
    const contact = await this.customer360.syncContactFromEntity(ctx, "RETAIL", event.payload.customer_id);
    if (!contact) return;

    const rules = await this.prisma.marketing_automation_rules.findMany({
      where: {
        tenant_id: event.tenant_id,
        trigger_event: "retail.order.completed",
        status: "ACTIVE",
      }
    });

    for (const rule of rules) {
      await this.executeRuleActions(ctx, rule, contact);
    }
  }

  private async handleCartAbandoned(event: DomainEvent) {
    this.logger.log(`Processing cart abandoned trigger for ${event.entity_id}`);
    // Logic similar to above...
  }

  private async executeRuleActions(ctx: any, rule: any, contact: any) {
    this.logger.log(`Executing actions for rule: ${rule.name}`);
    
    const actions = rule.actions as any[];
    if (!actions || !Array.isArray(actions)) return;

    for (const action of actions) {
      if (action.type === "SEND_MESSAGE") {
        await this.omnichannel.sendMessage(ctx, contact.id, action.channel, action.content);
      }
      
      // Log execution
      await this.prisma.marketing_automation_logs.create({
        data: {
          id: uuidv4(),
          rule_id: rule.id,
          contact_id: contact.id,
          status: "SUCCESS",
          triggered_at: new Date(),
        }
      });
    }
  }
}
