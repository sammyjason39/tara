import { Injectable, Logger } from "@nestjs/common";
import { EventBusService } from "../shared/events/event-bus.service";
import { CreateAgenticEventDto } from "../core/inventory/dto/create-agentic-event.dto";

@Injectable()
export class AgenticLayerService {
  private readonly logger = new Logger(AgenticLayerService.name);

  constructor(private readonly eventBus: EventBusService) {}

  /**
   * Evaluates an agentic event asynchronously.
   * Instead of direct DB writes, we publish an insight or recommendation.
   */
  async processEvent(tenant_id: string, data: CreateAgenticEventDto) {
    this.logger.log(`[AgenticLayer] Processing event for tenant ${tenant_id}: ${data.event_type}`);
    
    // Stub: Publish an AI recommendation event instead of direct mutation
    await this.eventBus.publish({
      event_type: "AGENTIC_INSIGHT_GENERATED",
      tenant_id,
      entity_id: "insight-123",
      entity_type: "AI_INSIGHT",
      source_module: "agentic",
      payload: {
        originalEvent: data,
        insight: "Agentic layer analysis complete",
      },
      user_id: "system-ai",
    });

    return { success: true, message: "Insight generated and published" };
  }

  /**
   * Stub for demand forecasting.
   * Returns a mock recommendation for now.
   */
  async getDemandForecast(tenant_id: string, product_id: string) {
    // This would call an AI model (e.g. Prophet, LSTM, or a Gemini-based agent)
    return {
      product_id,
      recommendedStock: 50,
      confidence: 0.85,
      reason: "Historical trend indicates 20% increase in demand next month.",
    };
  }

  /**
   * Stub for replenishment recommendations.
   */
  async getReplenishmentAdvice(tenant_id: string) {
    return [
      {
        sku: "PROD-001",
        action: "REORDER",
        qty: 25,
        priority: "HIGH",
        reason: "Stock below safety buffer; lead time 5 days.",
      },
    ];
  }
}
