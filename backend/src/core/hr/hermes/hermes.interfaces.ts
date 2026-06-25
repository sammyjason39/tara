/**
 * Hermes Integration — Core Interfaces
 *
 * Defines the typed contracts for Hermes ↔ TARA communication.
 * Hermes is the external LLM-based agentic AI that:
 *   - Reads events from TARA via WebSocket
 *   - Queries data via the Action Gateway
 *   - Executes SAFE actions (notifications, reminders, deadlines)
 *   - Suggests DECISION actions for human review
 */

// =============================================================================
// Authority Levels
// =============================================================================

/**
 * Authority levels for Hermes agents.
 * - read_only: can query data, cannot perform any action
 * - read_write: can query data AND execute safe actions (notifications, reminders)
 * - full_autonomous: reserved for future — can execute decision actions (not used now)
 */
export type HermesAuthorityLevel = 'read_only' | 'read_write' | 'full_autonomous';

// =============================================================================
// Action Catalog
// =============================================================================

/**
 * Safe actions Hermes CAN execute autonomously with `read_write` authority.
 * These are non-destructive, non-decision actions.
 */
export type HermesSafeActionType =
  | 'send_reminder'           // Remind employee/supervisor about a pending task
  | 'send_encouragement'      // Positive nudge (congrats, welcome, motivation)
  | 'send_deadline_notice'    // Inform about an upcoming deadline
  | 'send_notification'       // General informational notification
  | 'send_bulk_reminder'      // Remind a group about pending items
  | 'set_follow_up'           // Schedule a follow-up reminder for later
  | 'send_whatsapp_reply'     // Reply to a user's WhatsApp message
  | 'query_data';             // Read any data (attendance, leave, employees)

/**
 * Suggestion actions Hermes can PROPOSE but NOT execute.
 * These require human (HR) approval before taking effect.
 */
export type HermesSuggestionActionType =
  | 'suggest_leave_approval'
  | 'suggest_leave_rejection'
  | 'suggest_warning_letter'
  | 'suggest_schedule_change'
  | 'suggest_role_assignment'
  | 'suggest_attendance_override'
  | 'suggest_onboarding_override'
  | 'suggest_general';

// =============================================================================
// Action Request/Response
// =============================================================================

/** Incoming action request from Hermes */
export interface HermesActionRequest {
  /** Which registered Hermes agent is calling */
  agent_id: string;
  /** The action to perform */
  action: HermesSafeActionType;
  /** Action-specific parameters */
  params: Record<string, any>;
  /** Optional: idempotency key to prevent duplicate execution */
  idempotency_key?: string;
  /** Optional: correlation ID linking this action to an event */
  correlation_event_id?: string;
}

/** Result of an executed action */
export interface HermesActionResult {
  success: boolean;
  action: string;
  result?: any;
  error?: string;
  execution_ms: number;
  logged_id: string; // ID of the audit log entry
}

// =============================================================================
// Suggestion Request/Response
// =============================================================================

/** Incoming suggestion from Hermes for human review */
export interface HermesSuggestionRequest {
  agent_id: string;
  action_type: HermesSuggestionActionType;
  target_entity_id: string;
  entity_type: string; // 'leave_request', 'employee', 'attendance', etc.
  suggestion: Record<string, any>; // The proposed action details
  reasoning: string; // LLM's explanation of WHY
  confidence?: number; // 0.0 - 1.0 confidence score
  expires_in_hours?: number; // Auto-expire after N hours (default 72)
  correlation_event_id?: string;
}

export type HermesSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface HermesSuggestionResponse {
  id: string;
  status: HermesSuggestionStatus;
  created_at: Date;
  expires_at: Date | null;
}

// =============================================================================
// Data Query
// =============================================================================

/** Query request for reading data */
export interface HermesQueryRequest {
  agent_id: string;
  query_type: HermesQueryType;
  params: Record<string, any>;
}

export type HermesQueryType =
  | 'employee_info'
  | 'attendance_status'
  | 'attendance_history'
  | 'leave_balance'
  | 'pending_leave_requests'
  | 'department_summary'
  | 'notification_history'
  | 'onboarding_status'
  | 'weekly_checkin_status'
  | 'whatsapp_conversation_history'
  | 'whatsapp_session_status'
  | 'agent_health';

// =============================================================================
// Action Catalog Entry (returned by GET /catalog)
// =============================================================================

export interface HermesActionCatalogEntry {
  action: string;
  description: string;
  category: 'safe_action' | 'suggestion' | 'query';
  required_authority: HermesAuthorityLevel;
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
}

// =============================================================================
// Safety Guardrails Configuration
// =============================================================================

export interface HermesSafetyConfig {
  /** Max notifications per employee per day */
  max_notifications_per_employee_per_day: number;
  /** Min interval between duplicate reminders for same entity (hours) */
  min_reminder_interval_hours: number;
  /** Max message content length */
  max_message_length: number;
  /** Notification types Hermes can NEVER send */
  blocked_notification_types: string[];
  /** Max total actions per agent per hour */
  max_actions_per_agent_per_hour: number;
  /** Max suggestions per agent per day */
  max_suggestions_per_agent_per_day: number;
}

export const DEFAULT_SAFETY_CONFIG: HermesSafetyConfig = {
  max_notifications_per_employee_per_day: 5,
  min_reminder_interval_hours: 4,
  max_message_length: 1000,
  blocked_notification_types: [
    'warning_letter',
    'termination_notice',
    'salary_adjustment',
    'disciplinary_action',
  ],
  max_actions_per_agent_per_hour: 60,
  max_suggestions_per_agent_per_day: 20,
};
