import { HttpClient, HermesApiError } from './http-client';
import { EventStream } from './event-stream';
import {
  HermesSDKConfig,
  HermesActionRequest,
  HermesActionResult,
  HermesQueryRequest,
  HermesQueryResult,
  HermesSuggestionRequest,
  HermesSuggestionResult,
  HermesCatalogResponse,
  EventReplayOptions,
  EventReplayResult,
  EventStreamOptions,
  EventHandler,
  ConnectionHandler,
  ErrorHandler,
  HermesLogger,
} from './types';

/**
 * HermesClient — Main entry point for the Hermes SDK.
 *
 * Provides a clean interface for Hermes AI agents (running on a separate VPS)
 * to communicate with any TARA-compatible backend.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { HermesClient } from '@tara/hermes-sdk';
 *
 * const hermes = new HermesClient({
 *   baseUrl: 'https://tara.yourcompany.com',
 *   apiKey: 'your-hermes-api-key',
 *   agentId: 'hermes-main',
 * });
 *
 * // Get available tools
 * const catalog = await hermes.getCatalog();
 *
 * // Execute an action
 * const result = await hermes.execute('send_reminder', {
 *   recipient_id: 'emp-uuid',
 *   title: 'Submit timesheet',
 *   message: 'Your weekly timesheet is due.',
 * });
 *
 * // Query data
 * const employee = await hermes.query('employee_info', { employee_id: 'emp-uuid' });
 *
 * // Listen to real-time events
 * hermes.events.on('event', (event) => {
 *   console.log('Got event:', event.event_type);
 * });
 * await hermes.events.connect({ eventTypes: ['attendance.*', 'leave.*'] });
 * ```
 */
export class HermesClient {
  private readonly http: HttpClient;
  private readonly logger: HermesLogger;

  /** Real-time event stream (WebSocket) */
  public readonly events: EventStream;

  constructor(config: HermesSDKConfig) {
    if (!config.baseUrl) throw new Error('HermesClient: baseUrl is required');
    if (!config.apiKey) throw new Error('HermesClient: apiKey is required');

    this.http = new HttpClient(config);
    this.events = new EventStream(config);
    this.logger = config.logger || console;
  }

  // ===========================================================================
  // Action Catalog
  // ===========================================================================

  /**
   * Get the action catalog — the list of all tools available to this agent.
   * Use this to know what actions, queries, and suggestions you can make.
   */
  async getCatalog(): Promise<HermesCatalogResponse> {
    return this.http.get('/hermes/actions/catalog');
  }

  // ===========================================================================
  // Safe Actions
  // ===========================================================================

  /**
   * Execute a safe action (send notifications, reminders, follow-ups).
   * Requires `read_write` authority.
   *
   * @param action - Action type (e.g., 'send_reminder', 'send_notification')
   * @param params - Action parameters (recipient_id, title, message, etc.)
   * @param options - Optional idempotency key or correlation event ID
   */
  async execute(
    action: HermesActionRequest['action'],
    params: Record<string, any>,
    options?: { idempotency_key?: string; correlation_event_id?: string },
  ): Promise<HermesActionResult> {
    const body: HermesActionRequest = {
      action,
      params,
      ...options,
    };
    return this.http.post('/hermes/actions', body);
  }

  /**
   * Convenience: Send a reminder to an employee.
   */
  async sendReminder(recipientId: string, title: string, message: string, extra?: Record<string, any>): Promise<HermesActionResult> {
    return this.execute('send_reminder', { recipient_id: recipientId, title, message, ...extra });
  }

  /**
   * Convenience: Send an encouragement message.
   */
  async sendEncouragement(recipientId: string, title: string, message: string, type?: string): Promise<HermesActionResult> {
    return this.execute('send_encouragement', { recipient_id: recipientId, title, message, encouragement_type: type });
  }

  /**
   * Convenience: Send a deadline notice.
   */
  async sendDeadlineNotice(recipientId: string, title: string, message: string, deadline: string, urgency?: string): Promise<HermesActionResult> {
    return this.execute('send_deadline_notice', { recipient_id: recipientId, title, message, deadline, urgency });
  }

  /**
   * Convenience: Send a general notification.
   */
  async sendNotification(recipientId: string, title: string, message: string): Promise<HermesActionResult> {
    return this.execute('send_notification', { recipient_id: recipientId, title, message });
  }

  /**
   * Convenience: Send bulk reminder to multiple employees.
   */
  async sendBulkReminder(recipientIds: string[], title: string, message: string, extra?: Record<string, any>): Promise<HermesActionResult> {
    return this.execute('send_bulk_reminder', { recipient_ids: recipientIds, title, message, ...extra });
  }

  /**
   * Convenience: Schedule a follow-up reminder for the future.
   */
  async setFollowUp(recipientId: string, title: string, message: string, scheduledAt: string, extra?: Record<string, any>): Promise<HermesActionResult> {
    return this.execute('set_follow_up', { recipient_id: recipientId, title, message, scheduled_at: scheduledAt, ...extra });
  }

  /**
   * Convenience: Reply via WhatsApp.
   */
  async sendWhatsAppReply(recipientId: string, message: string, buttons?: Array<{ id: string; title: string }>): Promise<HermesActionResult> {
    return this.execute('send_whatsapp_reply', { recipient_id: recipientId, message, buttons });
  }

  // ===========================================================================
  // Data Queries
  // ===========================================================================

  /**
   * Query TARA data. Available to any authority level.
   *
   * @param queryType - What to query (employee_info, attendance_status, etc.)
   * @param params - Query-specific parameters
   */
  async query(queryType: HermesQueryRequest['query_type'], params?: Record<string, any>): Promise<HermesQueryResult> {
    return this.http.post('/hermes/query', { query_type: queryType, ...params });
  }

  /**
   * Convenience: Get employee information.
   */
  async getEmployee(employeeId: string) {
    return this.query('employee_info', { employee_id: employeeId });
  }

  /**
   * Convenience: Get today's attendance status.
   */
  async getAttendanceStatus(employeeId?: string, date?: string) {
    return this.query('attendance_status', { employee_id: employeeId, date });
  }

  /**
   * Convenience: Get attendance history.
   */
  async getAttendanceHistory(employeeId: string, startDate?: string, endDate?: string) {
    return this.query('attendance_history', { employee_id: employeeId, start_date: startDate, end_date: endDate });
  }

  /**
   * Convenience: Get leave balance.
   */
  async getLeaveBalance(employeeId: string) {
    return this.query('leave_balance', { employee_id: employeeId });
  }

  /**
   * Convenience: Get pending leave requests.
   */
  async getPendingLeaveRequests(employeeId?: string, departmentId?: string) {
    return this.query('pending_leave_requests', { employee_id: employeeId, department_id: departmentId });
  }

  /**
   * Convenience: Get department summary.
   */
  async getDepartmentSummary(departmentId?: string) {
    return this.query('department_summary', { department_id: departmentId });
  }

  // ===========================================================================
  // Suggestions (Human-in-the-loop)
  // ===========================================================================

  /**
   * Submit a suggestion for HR review.
   * Suggestions require a human to accept or reject them before taking effect.
   *
   * @param suggestion - The suggestion payload
   */
  async suggest(suggestion: HermesSuggestionRequest): Promise<HermesSuggestionResult> {
    return this.http.post('/hermes/suggestions', suggestion);
  }

  /**
   * Convenience: Suggest approving a leave request.
   */
  async suggestLeaveApproval(leaveRequestId: string, reasoning: string, confidence?: number): Promise<HermesSuggestionResult> {
    return this.suggest({
      action_type: 'suggest_leave_approval',
      target_entity_id: leaveRequestId,
      entity_type: 'leave_request',
      suggestion: { action: 'approve' },
      reasoning,
      confidence,
    });
  }

  /**
   * Convenience: Suggest rejecting a leave request.
   */
  async suggestLeaveRejection(leaveRequestId: string, reasoning: string, confidence?: number): Promise<HermesSuggestionResult> {
    return this.suggest({
      action_type: 'suggest_leave_rejection',
      target_entity_id: leaveRequestId,
      entity_type: 'leave_request',
      suggestion: { action: 'reject' },
      reasoning,
      confidence,
    });
  }

  /**
   * Convenience: Submit a general suggestion.
   */
  async suggestGeneral(title: string, reasoning: string, extra?: { target_entity_id?: string; entity_type?: string; confidence?: number }): Promise<HermesSuggestionResult> {
    return this.suggest({
      action_type: 'suggest_general',
      target_entity_id: extra?.target_entity_id || '',
      entity_type: extra?.entity_type || 'general',
      suggestion: { title },
      reasoning,
      confidence: extra?.confidence,
    });
  }

  // ===========================================================================
  // Event Replay
  // ===========================================================================

  /**
   * Replay missed events since a timestamp.
   * Use after reconnecting to catch up on events missed during disconnection.
   *
   * @param options - Replay options (since, types filter, limit)
   */
  async replayEvents(options: EventReplayOptions): Promise<EventReplayResult> {
    const params: Record<string, string> = { since: options.since };
    if (options.types) params.types = options.types.join(',');
    if (options.limit) params.limit = String(options.limit);

    return this.http.get('/hermes/events/replay', params);
  }

  // ===========================================================================
  // Audit & Stats
  // ===========================================================================

  /**
   * Get action audit logs for this agent.
   */
  async getAuditLogs(options?: { since?: string; status?: string; limit?: number }) {
    const params: Record<string, string> = {};
    if (options?.since) params.since = options.since;
    if (options?.status) params.status = options.status;
    if (options?.limit) params.limit = String(options.limit);

    return this.http.get('/hermes/events/audit', params);
  }

  /**
   * Get daily action statistics.
   */
  async getDailyStats() {
    return this.http.get('/hermes/events/stats');
  }

  // ===========================================================================
  // Health Check
  // ===========================================================================

  /**
   * Check if TARA backend is reachable and Hermes is enabled.
   */
  async healthCheck(): Promise<{ ok: boolean; latency_ms: number; error?: string }> {
    const start = Date.now();
    try {
      await this.getCatalog();
      return { ok: true, latency_ms: Date.now() - start };
    } catch (err: any) {
      return { ok: false, latency_ms: Date.now() - start, error: err.message };
    }
  }
}
