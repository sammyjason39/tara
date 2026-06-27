import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HermesDisabledGuard } from '../../ai/hermes-disabled.guard';
import { HermesApiKeyGuard, HermesAgentContext } from './hermes-api-key.guard';
import { HermesRateLimitGuard } from './hermes-rate-limit.guard';
import { HermesSafetyService } from './hermes-safety.service';
import { HermesAuditService } from './hermes-audit.service';
import { HermesSuggestionService } from './hermes-suggestion.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import {
  HermesSuggestionRequest,
  HermesSuggestionStatus,
} from './hermes.interfaces';

/**
 * Hermes Suggestion Controller
 *
 * Two audiences:
 * 1. Hermes agents: submit suggestions (authenticated via API key)
 * 2. HR team: review/accept/reject suggestions (authenticated via JWT)
 *
 * Endpoints:
 *   POST   /api/hermes/suggestions         — Hermes submits a suggestion (API key auth)
 *   GET    /api/hermes/suggestions         — List suggestions (JWT auth — HR dashboard)
 *   GET    /api/hermes/suggestions/stats   — Suggestion statistics (JWT auth)
 *   GET    /api/hermes/suggestions/:id     — Get single suggestion (JWT auth)
 *   PUT    /api/hermes/suggestions/:id/accept — Accept suggestion (JWT auth)
 *   PUT    /api/hermes/suggestions/:id/reject — Reject suggestion (JWT auth)
 */
@Controller('hermes/suggestions')
@UseGuards(HermesDisabledGuard)
export class HermesSuggestionController {
  private readonly logger = new Logger(HermesSuggestionController.name);

  constructor(
    private readonly suggestionService: HermesSuggestionService,
    private readonly safetyService: HermesSafetyService,
    private readonly auditService: HermesAuditService,
  ) {}

  // ===========================================================================
  // Hermes Agent endpoints (API Key auth)
  // ===========================================================================

  /**
   * POST /api/hermes/suggestions
   * Hermes submits a suggestion for human review.
   * Auth: X-Hermes-Api-Key
   */
  @Post()
  @UseGuards(HermesApiKeyGuard, HermesRateLimitGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitSuggestion(@Request() req: any, @Body() body: HermesSuggestionRequest) {
    const agent: HermesAgentContext = req.hermesAgent;

    // Safety check: daily suggestion limit
    await this.safetyService.validateSuggestion(agent.id);

    // Override agent_id from the authenticated agent context
    body.agent_id = agent.id;

    const result = await this.suggestionService.createSuggestion(body);

    // Audit log
    await this.auditService.logAction({
      agent_id: agent.id,
      action_type: `suggestion:${body.action_type}`,
      parameters: body as any,
      authority_level: agent.authority_level,
      status: 'success',
      result,
    });

    return { success: true, data: result };
  }

  // ===========================================================================
  // HR Team endpoints (JWT auth)
  // ===========================================================================

  /**
   * GET /api/hermes/suggestions
   * List suggestions with optional status filter.
   * Auth: JWT (HR team)
   */
  @Get()
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async listSuggestions(
    @Query('status') status?: HermesSuggestionStatus,
    @Query('agent_id') agentId?: string,
    @Query('entity_type') entityType?: string,
    @Query('limit') limit?: string,
  ) {
    const suggestions = await this.suggestionService.listSuggestions({
      status,
      agent_id: agentId,
      entity_type: entityType,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return { success: true, data: suggestions };
  }

  /**
   * GET /api/hermes/suggestions/stats
   * Get suggestion statistics for dashboard.
   * Auth: JWT (HR team)
   */
  @Get('stats')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async getStats() {
    const stats = await this.suggestionService.getStats();
    return { success: true, data: stats };
  }

  /**
   * GET /api/hermes/suggestions/:id
   * Get a single suggestion by ID.
   * Auth: JWT (HR team)
   */
  @Get(':id')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async getSuggestion(@Param('id') id: string) {
    const suggestion = await this.suggestionService.getSuggestion(id);
    return { success: true, data: suggestion };
  }

  /**
   * PUT /api/hermes/suggestions/:id/accept
   * HR accepts a suggestion.
   * Auth: JWT (HR team)
   */
  @Put(':id/accept')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async acceptSuggestion(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { notes?: string },
  ) {
    const reviewedBy = req.user?.employee_id || req.user?.id || 'unknown';

    const updated = await this.suggestionService.acceptSuggestion(id, reviewedBy, body.notes);
    return { success: true, data: updated };
  }

  /**
   * PUT /api/hermes/suggestions/:id/reject
   * HR rejects a suggestion with a reason.
   * Auth: JWT (HR team)
   */
  @Put(':id/reject')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async rejectSuggestion(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { reason: string },
  ) {
    const reviewedBy = req.user?.employee_id || req.user?.id || 'unknown';

    const updated = await this.suggestionService.rejectSuggestion(id, reviewedBy, body.reason);
    return { success: true, data: updated };
  }
}
