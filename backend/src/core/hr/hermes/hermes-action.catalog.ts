import { HermesActionCatalogEntry } from './hermes.interfaces';

/**
 * Hermes Action Catalog
 *
 * The definitive list of actions available to Hermes agents.
 * Returned by GET /api/hermes/actions/catalog so the LLM knows its "tool list."
 */
export const HERMES_ACTION_CATALOG: HermesActionCatalogEntry[] = [
  // =========================================================================
  // SAFE ACTIONS (read_write authority)
  // =========================================================================
  {
    action: 'send_reminder',
    description: 'Send a reminder notification to a specific employee or supervisor about a pending task or action.',
    category: 'safe_action',
    required_authority: 'read_write',
    parameters: [
      { name: 'recipient_id', type: 'string (UUID)', required: true, description: 'Employee ID to receive the reminder' },
      { name: 'title', type: 'string', required: true, description: 'Short title for the reminder (max 100 chars)' },
      { name: 'message', type: 'string', required: true, description: 'Reminder message content (max 1000 chars)' },
      { name: 'context_entity_id', type: 'string', required: false, description: 'Related entity ID (leave request, attendance, etc.)' },
      { name: 'context_entity_type', type: 'string', required: false, description: 'Entity type: leave_request, attendance, onboarding, etc.' },
      { name: 'deadline', type: 'string (ISO 8601)', required: false, description: 'Deadline timestamp to include in the reminder' },
    ],
  },
  {
    action: 'send_encouragement',
    description: 'Send a positive/motivational message to an employee (congratulations, welcome, good performance acknowledgment).',
    category: 'safe_action',
    required_authority: 'read_write',
    parameters: [
      { name: 'recipient_id', type: 'string (UUID)', required: true, description: 'Employee ID to encourage' },
      { name: 'title', type: 'string', required: true, description: 'Short title (max 100 chars)' },
      { name: 'message', type: 'string', required: true, description: 'Encouragement message (max 1000 chars)' },
      { name: 'encouragement_type', type: 'string', required: false, description: 'Type: welcome, congratulations, motivation, milestone, attendance_streak' },
    ],
  },
  {
    action: 'send_deadline_notice',
    description: 'Notify an employee or supervisor about an upcoming deadline that requires their action.',
    category: 'safe_action',
    required_authority: 'read_write',
    parameters: [
      { name: 'recipient_id', type: 'string (UUID)', required: true, description: 'Employee ID to notify' },
      { name: 'title', type: 'string', required: true, description: 'Short title (max 100 chars)' },
      { name: 'message', type: 'string', required: true, description: 'Deadline notice content (max 1000 chars)' },
      { name: 'deadline', type: 'string (ISO 8601)', required: true, description: 'The deadline date/time' },
      { name: 'context_entity_id', type: 'string', required: false, description: 'Related entity ID' },
      { name: 'context_entity_type', type: 'string', required: false, description: 'Entity type' },
      { name: 'urgency', type: 'string', required: false, description: 'Urgency level: low, medium, high' },
    ],
  },
  {
    action: 'send_notification',
    description: 'Send a general informational notification to an employee. Not a reminder or encouragement — just information.',
    category: 'safe_action',
    required_authority: 'read_write',
    parameters: [
      { name: 'recipient_id', type: 'string (UUID)', required: true, description: 'Employee ID' },
      { name: 'title', type: 'string', required: true, description: 'Notification title (max 100 chars)' },
      { name: 'message', type: 'string', required: true, description: 'Notification content (max 1000 chars)' },
      { name: 'notification_type', type: 'string', required: false, description: 'Optional type categorization' },
    ],
  },
  {
    action: 'send_bulk_reminder',
    description: 'Send the same reminder to multiple employees at once.',
    category: 'safe_action',
    required_authority: 'read_write',
    parameters: [
      { name: 'recipient_ids', type: 'string[] (UUIDs)', required: true, description: 'Array of employee IDs' },
      { name: 'title', type: 'string', required: true, description: 'Reminder title (max 100 chars)' },
      { name: 'message', type: 'string', required: true, description: 'Reminder message (max 1000 chars)' },
      { name: 'context_entity_type', type: 'string', required: false, description: 'What this reminder is about' },
      { name: 'deadline', type: 'string (ISO 8601)', required: false, description: 'Shared deadline' },
    ],
  },
  {
    action: 'set_follow_up',
    description: 'Schedule a follow-up reminder to be sent at a future time. Hermes asks TARA to send a reminder later.',
    category: 'safe_action',
    required_authority: 'read_write',
    parameters: [
      { name: 'recipient_id', type: 'string (UUID)', required: true, description: 'Who should receive the follow-up' },
      { name: 'title', type: 'string', required: true, description: 'Follow-up title (max 100 chars)' },
      { name: 'message', type: 'string', required: true, description: 'Follow-up message (max 1000 chars)' },
      { name: 'scheduled_at', type: 'string (ISO 8601)', required: true, description: 'When to send the follow-up (must be in the future)' },
      { name: 'context_entity_id', type: 'string', required: false, description: 'Related entity' },
      { name: 'context_entity_type', type: 'string', required: false, description: 'Entity type' },
    ],
  },
  {
    action: 'query_data',
    description: 'Query TARA data. Returns structured data for employee info, attendance, leave balances, etc.',
    category: 'query',
    required_authority: 'read_only',
    parameters: [
      { name: 'query_type', type: 'string', required: true, description: 'One of: employee_info, attendance_status, attendance_history, leave_balance, pending_leave_requests, department_summary, notification_history, onboarding_status, weekly_checkin_status, agent_health' },
      { name: 'employee_id', type: 'string (UUID)', required: false, description: 'Employee ID (required for employee-specific queries)' },
      { name: 'department_id', type: 'string (UUID)', required: false, description: 'Department ID (for department_summary)' },
      { name: 'date', type: 'string (YYYY-MM-DD)', required: false, description: 'Date for attendance queries' },
      { name: 'start_date', type: 'string (YYYY-MM-DD)', required: false, description: 'Start date for range queries' },
      { name: 'end_date', type: 'string (YYYY-MM-DD)', required: false, description: 'End date for range queries' },
    ],
  },

  // =========================================================================
  // SUGGESTION ACTIONS (creates proposal for human review)
  // =========================================================================
  {
    action: 'suggest_leave_approval',
    description: 'Suggest that a pending leave request should be approved. Requires HR/supervisor to confirm.',
    category: 'suggestion',
    required_authority: 'read_only',
    parameters: [
      { name: 'target_entity_id', type: 'string (UUID)', required: true, description: 'Leave request ID' },
      { name: 'reasoning', type: 'string', required: true, description: 'Explanation of why approval is recommended' },
      { name: 'confidence', type: 'number (0-1)', required: false, description: 'Confidence score' },
    ],
  },
  {
    action: 'suggest_leave_rejection',
    description: 'Suggest that a pending leave request should be rejected. Requires HR/supervisor to confirm.',
    category: 'suggestion',
    required_authority: 'read_only',
    parameters: [
      { name: 'target_entity_id', type: 'string (UUID)', required: true, description: 'Leave request ID' },
      { name: 'reasoning', type: 'string', required: true, description: 'Explanation of why rejection is recommended' },
      { name: 'confidence', type: 'number (0-1)', required: false, description: 'Confidence score' },
    ],
  },
  {
    action: 'suggest_warning_letter',
    description: 'Suggest issuing a warning letter to an employee. Requires HR review and approval.',
    category: 'suggestion',
    required_authority: 'read_only',
    parameters: [
      { name: 'target_entity_id', type: 'string (UUID)', required: true, description: 'Employee ID' },
      { name: 'warning_level', type: 'string', required: true, description: 'Suggested level: SP1, SP2, SP3' },
      { name: 'reason', type: 'string', required: true, description: 'Reason for the warning' },
      { name: 'reasoning', type: 'string', required: true, description: 'AI reasoning for why this is recommended' },
      { name: 'confidence', type: 'number (0-1)', required: false, description: 'Confidence score' },
    ],
  },
  {
    action: 'suggest_schedule_change',
    description: 'Suggest a schedule change for an employee. Requires HR approval.',
    category: 'suggestion',
    required_authority: 'read_only',
    parameters: [
      { name: 'target_entity_id', type: 'string (UUID)', required: true, description: 'Employee ID' },
      { name: 'proposed_schedule_id', type: 'string (UUID)', required: true, description: 'Proposed new schedule' },
      { name: 'reasoning', type: 'string', required: true, description: 'Why this change is recommended' },
      { name: 'confidence', type: 'number (0-1)', required: false, description: 'Confidence score' },
    ],
  },
  {
    action: 'suggest_general',
    description: 'Submit a general suggestion/insight for HR team review.',
    category: 'suggestion',
    required_authority: 'read_only',
    parameters: [
      { name: 'target_entity_id', type: 'string (UUID)', required: false, description: 'Related entity ID (if any)' },
      { name: 'entity_type', type: 'string', required: false, description: 'Entity type' },
      { name: 'suggestion_title', type: 'string', required: true, description: 'Brief title for the suggestion' },
      { name: 'reasoning', type: 'string', required: true, description: 'Detailed reasoning' },
      { name: 'confidence', type: 'number (0-1)', required: false, description: 'Confidence score' },
    ],
  },

  // =========================================================================
  // WHATSAPP ACTIONS (send replies via user's WhatsApp)
  // =========================================================================
  {
    action: 'send_whatsapp_reply',
    description: 'Send a reply to an employee via their WhatsApp. The employee must have opted-in and verified their number. Use this to respond to inbound WhatsApp messages from employees.',
    category: 'safe_action',
    required_authority: 'read_write',
    parameters: [
      { name: 'recipient_id', type: 'string (UUID)', required: true, description: 'Employee ID to send the reply to' },
      { name: 'message', type: 'string', required: true, description: 'Reply message content (max 4096 chars)' },
      { name: 'buttons', type: 'array', required: false, description: 'Optional interactive buttons (max 3): [{id: string, title: string}]' },
    ],
  },
  {
    action: 'query_whatsapp_conversation',
    description: 'Get recent WhatsApp conversation history with an employee. Useful for understanding context before replying.',
    category: 'query',
    required_authority: 'read_only',
    parameters: [
      { name: 'employee_id', type: 'string (UUID)', required: true, description: 'Employee ID to get conversation for' },
      { name: 'limit', type: 'number', required: false, description: 'Max messages to return (default: 20)' },
    ],
  },
];
