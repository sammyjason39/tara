import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Inject,
  Optional,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { HermesApiKeyGuard, HermesAgentContext } from './hermes-api-key.guard';
import { HermesAuthorityGuard, RequiresAuthority } from './hermes-authority.guard';
import { HermesRateLimitGuard } from './hermes-rate-limit.guard';
import { HermesSafetyService } from './hermes-safety.service';
import { HermesAuditService } from './hermes-audit.service';
import { HermesNotificationExecutor } from './executors/notification.executor';
import { HermesFollowUpExecutor } from './executors/follow-up.executor';
import { HermesQueryExecutor } from './executors/query.executor';
import { HERMES_WHATSAPP_AGENT } from './hermes.tokens';
import { HERMES_ACTION_CATALOG } from './hermes-action.catalog';
import {
  HermesActionRequest,
  HermesActionResult,
  HermesSafeActionType,
  HermesQueryType,
} from './hermes.interfaces';

/**
 * Hermes Action Gateway Controller
 *
 * Single entry point for all Hermes agent actions:
 *   - GET  /api/hermes/actions/catalog — tool list for LLM
 *   - POST /api/hermes/actions         — execute a safe action
 *   - POST /api/hermes/query           — read data
 *
 * All endpoints require X-Hermes-Api-Key authentication.
 * Authority level is enforced per action.
 */
@Controller('hermes')
@UseGuards(HermesApiKeyGuard, HermesRateLimitGuard)
export class HermesActionController {
  private readonly logger = new Logger(HermesActionController.name);

  constructor(
    private readonly safetyService: HermesSafetyService,
    private readonly auditService: HermesAuditService,
    private readonly notificationExecutor: HermesNotificationExecutor,
    private readonly followUpExecutor: HermesFollowUpExecutor,
    private readonly queryExecutor: HermesQueryExecutor,
    @Inject(HERMES_WHATSAPP_AGENT) @Optional() private readonly whatsAppAgent: any,
  ) {}

  /**
   * GET /api/hermes/actions/catalog
   *
   * Returns the full action catalog so the LLM knows what tools are available.
   * Available to any authenticated Hermes agent (read_only is sufficient).
   */
  @Get('actions/catalog')
  @HttpCode(HttpStatus.OK)
  getCatalog(@Request() req: any) {
    const agent: HermesAgentContext = req.hermesAgent;

    // Filter catalog to only show actions the agent has authority for
    return {
      agent_id: agent.id,
      agent_name: agent.name,
      authority_level: agent.authority_level,
      available_actions: HERMES_ACTION_CATALOG.filter((entry) => {
        return this.hasAuthority(agent.authority_level, entry.required_authority);
      }),
    };
  }

  /**
   * POST /api/hermes/actions
   *
   * Execute a safe action. Requires `read_write` authority.
   * Body: { action, params, idempotency_key?, correlation_event_id? }
   */
  @Post('actions')
  @UseGuards(HermesAuthorityGuard)
  @RequiresAuthority('read_write')
  @HttpCode(HttpStatus.OK)
  async executeAction(
    @Request() req: any,
    @Body() body: HermesActionRequest,
  ): Promise<HermesActionResult> {
    const agent: HermesAgentContext = req.hermesAgent;
    const startTime = Date.now();

    // Validate action type
    const validActions: HermesSafeActionType[] = [
      'send_reminder',
      'send_encouragement',
      'send_deadline_notice',
      'send_notification',
      'send_bulk_reminder',
      'set_follow_up',
      'send_whatsapp_reply',
    ];
    if (!validActions.includes(body.action as HermesSafeActionType)) {
      const logId = await this.auditService.logAction({
        agent_id: agent.id,
        action_type: body.action,
        parameters: body.params,
        authority_level: agent.authority_level,
        status: 'failed',
        error_message: `Invalid action type: ${body.action}`,
      });
      throw new BadRequestException(`Invalid action: ${body.action}. Use POST /api/hermes/query for data queries.`);
    }

    // Safety checks
    try {
      await this.safetyService.validateAction(agent.id, body.action as HermesSafeActionType, body.params);
    } catch (err) {
      const logId = await this.auditService.logAction({
        agent_id: agent.id,
        action_type: body.action,
        parameters: body.params,
        authority_level: agent.authority_level,
        status: 'safety_blocked',
        error_message: err.message,
      });
      throw err;
    }

    // Execute the action
    try {
      const result = await this.dispatch(agent.id, body.action as HermesSafeActionType, body.params);
      const executionMs = Date.now() - startTime;

      const logId = await this.auditService.logAction({
        agent_id: agent.id,
        action_type: body.action,
        parameters: body.params,
        authority_level: agent.authority_level,
        status: 'success',
        result,
        execution_ms: executionMs,
      });

      return {
        success: true,
        action: body.action,
        result,
        execution_ms: executionMs,
        logged_id: logId,
      };
    } catch (err) {
      const executionMs = Date.now() - startTime;

      const logId = await this.auditService.logAction({
        agent_id: agent.id,
        action_type: body.action,
        parameters: body.params,
        authority_level: agent.authority_level,
        status: 'failed',
        error_message: err.message,
        execution_ms: executionMs,
      });

      return {
        success: false,
        action: body.action,
        error: err.message,
        execution_ms: executionMs,
        logged_id: logId,
      };
    }
  }

  /**
   * POST /api/hermes/query
   *
   * Query TARA data. Available to `read_only` agents and above.
   * Body: { query_type, ...params }
   */
  @Post('query')
  @UseGuards(HermesAuthorityGuard)
  @RequiresAuthority('read_only')
  @HttpCode(HttpStatus.OK)
  async queryData(@Request() req: any, @Body() body: { query_type: string } & Record<string, any>) {
    const agent: HermesAgentContext = req.hermesAgent;
    const startTime = Date.now();

    if (!body.query_type) {
      throw new BadRequestException('query_type is required');
    }

    try {
      const result = await this.queryExecutor.execute(body.query_type as HermesQueryType, body);
      const executionMs = Date.now() - startTime;

      // Log queries too (for monitoring — not counted against action rate limit)
      await this.auditService.logAction({
        agent_id: agent.id,
        action_type: `query:${body.query_type}`,
        parameters: body,
        authority_level: agent.authority_level,
        status: 'success',
        execution_ms: executionMs,
      });

      return { success: true, query_type: body.query_type, data: result, execution_ms: executionMs };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  // ===========================================================================
  // Private dispatch
  // ===========================================================================

  private async dispatch(agentId: string, action: HermesSafeActionType, params: Record<string, any>): Promise<any> {
    switch (action) {
      case 'send_reminder':
        return this.notificationExecutor.sendReminder(agentId, params as any);
      case 'send_encouragement':
        return this.notificationExecutor.sendEncouragement(agentId, params as any);
      case 'send_deadline_notice':
        return this.notificationExecutor.sendDeadlineNotice(agentId, params as any);
      case 'send_notification':
        return this.notificationExecutor.sendNotification(agentId, params as any);
      case 'send_bulk_reminder':
        return this.notificationExecutor.sendBulkReminder(agentId, params as any);
      case 'set_follow_up':
        return this.followUpExecutor.setFollowUp(agentId, params as any);
      case 'send_whatsapp_reply':
        if (!this.whatsAppAgent) {
          throw new BadRequestException('WhatsApp integration is not configured in this deployment');
        }
        return this.whatsAppAgent.executeReply({
          employee_id: params.recipient_id,
          message: params.message,
          hermes_agent_id: agentId,
          buttons: params.buttons,
        });
      default:
        throw new BadRequestException(`Unhandled action: ${action}`);
    }
  }

  private hasAuthority(agentAuthority: string, requiredAuthority: string): boolean {
    const hierarchy = ['read_only', 'read_write', 'full_autonomous'];
    return hierarchy.indexOf(agentAuthority) >= hierarchy.indexOf(requiredAuthority);
  }
}
