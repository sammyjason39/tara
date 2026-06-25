/**
 * Hermes SDK — Type definitions
 *
 * These types mirror the TARA backend's Hermes interfaces.
 * They define the contract for Hermes ↔ TARA communication over HTTP/WebSocket.
 */

// =============================================================================
// Connection Config
// =============================================================================

export interface HermesSDKConfig {
  /** Base URL of the TARA backend (e.g., "https://tara.example.com") */
  baseUrl: string;
  /** API key for authentication (X-Hermes-Api-Key header) */
  apiKey: string;
  /** Optional agent ID for multi-agent setups */
  agentId?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Retry config */
  retry?: {
    maxRetries: number;
    backoffMs: number;
  };
  /** Optional logger override */
  logger?: HermesLogger;
}

export interface HermesLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

// =============================================================================
// Authority Levels
// =============================================================================

export type HermesAuthorityLevel = 'read_only' | 'read_write' | 'full_autonomous';

// =============================================================================
// Actions
// =============================================================================

export type HermesSafeActionType =
  | 'send_reminder'
  | 'send_encouragement'
  | 'send_deadline_notice'
  | 'send_notification'
  | 'send_bulk_reminder'
  | 'set_follow_up'
  | 'send_whatsapp_reply';

export interface HermesActionRequest {
  action: HermesSafeActionType;
  params: Record<string, any>;
  idempotency_key?: string;
  correlation_event_id?: string;
}

export interface HermesActionResult {
  success: boolean;
  action: string;
  result?: any;
  error?: string;
  execution_ms: number;
  logged_id: string;
}

// =============================================================================
// Queries
// =============================================================================

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

export interface HermesQueryRequest {
  query_type: HermesQueryType;
  [key: string]: any;
}

export interface HermesQueryResult {
  success: boolean;
  query_type: string;
  data: any;
  execution_ms: number;
}

// =============================================================================
// Suggestions
// =============================================================================

export type HermesSuggestionActionType =
  | 'suggest_leave_approval'
  | 'suggest_leave_rejection'
  | 'suggest_warning_letter'
  | 'suggest_schedule_change'
  | 'suggest_role_assignment'
  | 'suggest_attendance_override'
  | 'suggest_onboarding_override'
  | 'suggest_general';

export interface HermesSuggestionRequest {
  action_type: HermesSuggestionActionType;
  target_entity_id: string;
  entity_type: string;
  suggestion: Record<string, any>;
  reasoning: string;
  confidence?: number;
  expires_in_hours?: number;
  correlation_event_id?: string;
}

export interface HermesSuggestionResult {
  success: boolean;
  data: {
    id: string;
    status: 'pending';
    created_at: string;
    expires_at: string | null;
  };
}

// =============================================================================
// Action Catalog
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

export interface HermesCatalogResponse {
  agent_id: string;
  agent_name: string;
  authority_level: HermesAuthorityLevel;
  available_actions: HermesActionCatalogEntry[];
}

// =============================================================================
// Events
// =============================================================================

export interface TaraEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  actor: { id: string; type: string };
  entity: { id: string; type: string };
  payload: any;
}

export interface EventReplayOptions {
  since: string; // ISO 8601
  types?: string[]; // Event type filters (supports wildcards like "attendance.*")
  limit?: number; // Max events (default 200, max 1000)
}

export interface EventReplayResult {
  success: boolean;
  since: string;
  count: number;
  has_more: boolean;
  events: TaraEvent[];
}

// =============================================================================
// Event Stream (WebSocket)
// =============================================================================

export interface EventStreamOptions {
  /** Event types to subscribe to (supports wildcards). Default: ['*'] */
  eventTypes?: string[];
  /** Auto-reconnect on disconnect. Default: true */
  autoReconnect?: boolean;
  /** Max reconnection attempts. Default: 10 */
  maxReconnectAttempts?: number;
  /** Reconnection delay in ms. Default: 3000 */
  reconnectDelay?: number;
}

export type EventHandler = (event: TaraEvent) => void | Promise<void>;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: Error) => void;
