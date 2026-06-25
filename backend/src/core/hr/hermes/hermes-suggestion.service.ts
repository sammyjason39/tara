import { Injectable, Inject, Optional, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../persistence/prisma.service';
import { HERMES_EVENT_BUS_SERVICE } from './hermes.tokens';
import {
  HermesSuggestionRequest,
  HermesSuggestionResponse,
  HermesSuggestionStatus,
} from './hermes.interfaces';

/**
 * Minimal interface for the event bus adapter.
 */
export interface IHermesEventBusAdapter {
  emit(event: {
    event_type: string;
    actor: { id: string; type: string };
    entity: { id: string; type: string };
    payload: Record<string, any>;
  }): Promise<void>;
}

/**
 * Hermes Suggestion Service
 *
 * Manages the human-in-the-loop workflow for decision-level actions:
 * 1. Hermes submits a suggestion (e.g., "approve this leave request")
 * 2. Suggestion lands in a queue visible to HR on the dashboard
 * 3. HR accepts or rejects with optional notes
 * 4. On accept: the actual action is dispatched (leave approval, etc.)
 * 5. On reject: logged, Hermes can learn from rejection patterns
 *
 * Auto-expiry: suggestions not acted on within `expires_in_hours` are marked expired.
 */
@Injectable()
export class HermesSuggestionService {
  private readonly logger = new Logger(HermesSuggestionService.name);
  private readonly DEFAULT_EXPIRY_HOURS = 72;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(HERMES_EVENT_BUS_SERVICE) @Optional() private readonly eventBusService: IHermesEventBusAdapter | null,
  ) {}

  /**
   * Submit a new suggestion from Hermes.
   */
  async createSuggestion(request: HermesSuggestionRequest): Promise<HermesSuggestionResponse> {
    const expiresInHours = request.expires_in_hours ?? this.DEFAULT_EXPIRY_HOURS;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const suggestion = await this.prisma.hermesSuggestion.create({
      data: {
        agent_id: request.agent_id,
        action_type: request.action_type,
        target_entity_id: request.target_entity_id,
        entity_type: request.entity_type,
        suggestion: request.suggestion as any,
        reasoning: request.reasoning,
        confidence: request.confidence ?? null,
        correlation_event_id: request.correlation_event_id ?? null,
        status: 'pending',
        expires_at: expiresAt,
      },
    });

    this.logger.log(
      `[HERMES] Suggestion created: ${suggestion.id} | type=${request.action_type} | entity=${request.entity_type}:${request.target_entity_id}`,
    );

    // Emit event so the UI can show real-time notification
    await this.emitSuggestionEvent('hermes.suggestion.created', suggestion);

    return {
      id: suggestion.id,
      status: 'pending',
      created_at: suggestion.created_at,
      expires_at: suggestion.expires_at,
    };
  }

  /**
   * List suggestions with optional filters.
   */
  async listSuggestions(options?: {
    status?: HermesSuggestionStatus;
    agent_id?: string;
    entity_type?: string;
    limit?: number;
  }) {
    const where: any = {};
    if (options?.status) where.status = options.status;
    if (options?.agent_id) where.agent_id = options.agent_id;
    if (options?.entity_type) where.entity_type = options.entity_type;

    return this.prisma.hermesSuggestion.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: options?.limit ?? 50,
    });
  }

  /**
   * Get a single suggestion by ID.
   */
  async getSuggestion(id: string) {
    const suggestion = await this.prisma.hermesSuggestion.findUnique({ where: { id } });
    if (!suggestion) throw new NotFoundException(`Suggestion not found: ${id}`);
    return suggestion;
  }

  /**
   * Accept a suggestion. HR confirms the proposed action.
   * The caller is responsible for executing the actual action after acceptance.
   */
  async acceptSuggestion(id: string, reviewedBy: string, notes?: string) {
    const suggestion = await this.getSuggestion(id);

    if (suggestion.status !== 'pending') {
      throw new BadRequestException(`Suggestion is already ${suggestion.status}`);
    }

    const updated = await this.prisma.hermesSuggestion.update({
      where: { id },
      data: {
        status: 'accepted',
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
        review_notes: notes ?? null,
      },
    });

    this.logger.log(`[HERMES] Suggestion accepted: ${id} by ${reviewedBy}`);
    await this.emitSuggestionEvent('hermes.suggestion.accepted', updated);

    return updated;
  }

  /**
   * Reject a suggestion. HR declines the proposed action.
   */
  async rejectSuggestion(id: string, reviewedBy: string, reason: string) {
    const suggestion = await this.getSuggestion(id);

    if (suggestion.status !== 'pending') {
      throw new BadRequestException(`Suggestion is already ${suggestion.status}`);
    }

    if (!reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updated = await this.prisma.hermesSuggestion.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
        review_notes: reason,
      },
    });

    this.logger.log(`[HERMES] Suggestion rejected: ${id} by ${reviewedBy} — ${reason}`);
    await this.emitSuggestionEvent('hermes.suggestion.rejected', updated);

    return updated;
  }

  /**
   * Get suggestion statistics for dashboard.
   */
  async getStats() {
    const [pending, accepted, rejected, expired] = await Promise.all([
      this.prisma.hermesSuggestion.count({ where: { status: 'pending' } }),
      this.prisma.hermesSuggestion.count({ where: { status: 'accepted' } }),
      this.prisma.hermesSuggestion.count({ where: { status: 'rejected' } }),
      this.prisma.hermesSuggestion.count({ where: { status: 'expired' } }),
    ]);

    const total = pending + accepted + rejected + expired;
    const acceptanceRate = total > 0 ? accepted / (accepted + rejected) : 0;

    return { pending, accepted, rejected, expired, total, acceptance_rate: acceptanceRate };
  }

  /**
   * Scheduled task: expire stale suggestions.
   * Runs every hour to mark expired suggestions.
   */
  @Cron('0 * * * *') // Every hour
  async expireStale(): Promise<void> {
    const now = new Date();

    const result = await this.prisma.hermesSuggestion.updateMany({
      where: {
        status: 'pending',
        expires_at: { lte: now },
      },
      data: { status: 'expired' },
    });

    if (result.count > 0) {
      this.logger.log(`[HERMES] Expired ${result.count} stale suggestion(s)`);
    }
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================

  private async emitSuggestionEvent(eventType: string, suggestion: any): Promise<void> {
    if (!this.eventBusService) return; // EventBus not configured — skip silently

    try {
      await this.eventBusService.emit({
        event_type: eventType,
        actor: { id: suggestion.agent_id, type: 'agent' },
        entity: { id: suggestion.id, type: 'hermes_suggestion' },
        payload: {
          action_type: suggestion.action_type,
          target_entity_id: suggestion.target_entity_id,
          entity_type: suggestion.entity_type,
          status: suggestion.status,
          reasoning: suggestion.reasoning,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to emit suggestion event: ${err.message}`);
    }
  }
}
