# WhatsApp Agent Integration

## Overview

Bidirectional WhatsApp communication between employees and Hermes AI, powered by [Kapso](https://kapso.com) WhatsApp Business API.

Employees set their own WhatsApp number, verify it via OTP, and then interact with Hermes through WhatsApp for all agentic HR operations.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Employee's WhatsApp                          │
│                  (personal phone)                             │
└─────────────┬─────────────────────────────────┬─────────────┘
              │ inbound messages                  ▲ outbound
              ▼                                   │
┌─────────────────────────────────────────────────────────────┐
│              Kapso WhatsApp Business API                      │
│              (webhook → POST /api/whatsapp/webhook)           │
└─────────────┬─────────────────────────────────┬─────────────┘
              │                                   │
              ▼                                   │
┌─────────────────────────────────────────────────────────────┐
│              WhatsApp Agent Module                            │
│                                                              │
│  InboundService   → parse, identify employee, emit event     │
│  OutboundService  → validate, rate limit, send via Kapso     │
│  SessionService   → conversation state, auto-timeout         │
│  AuditService     → full message log, 90-day retention       │
│  VerificationSvc  → OTP flow for number verification         │
│  WhatsAppAgent    → event-driven bridge to Hermes            │
└─────────────┬─────────────────────────────────┬─────────────┘
              │                                   ▲
              ▼                                   │
┌─────────────────────────────────────────────────────────────┐
│              Event Bus                                        │
│                                                              │
│  whatsapp.message.inbound  → Hermes picks up                 │
│  whatsapp.message.outbound → Audit logged                    │
│  whatsapp.delivery.failed  → Retry / alert                   │
│  whatsapp.verification.*   → OTP tracking                    │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│              Hermes LLM Agent                                 │
│                                                              │
│  Receives: whatsapp.message.inbound events                   │
│  Queries:  whatsapp_conversation_history                     │
│  Actions:  send_whatsapp_reply                               │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Employee Self-Service (JWT auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/me/whatsapp` | Get current WhatsApp status |
| PUT | `/api/me/whatsapp` | Set number + trigger OTP verification |
| POST | `/api/me/whatsapp/verify` | Confirm 6-digit OTP code |
| DELETE | `/api/me/whatsapp` | Revoke WhatsApp opt-in |
| GET | `/api/me/whatsapp/history` | View own message history |

### Admin (JWT auth, HR_Team)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/whatsapp/status` | All employees' WA status overview |
| GET | `/api/admin/whatsapp/employees/:id` | Employee WA details + messages |
| GET | `/api/admin/whatsapp/health` | Service health check |

### Webhook (Kapso callback, signature-verified)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/whatsapp/webhook` | Meta verification challenge |
| POST | `/api/whatsapp/webhook` | Inbound messages + delivery statuses |

## Hermes Integration

### New Action: `send_whatsapp_reply`

```json
{
  "action": "send_whatsapp_reply",
  "params": {
    "recipient_id": "employee-uuid",
    "message": "Hello from Hermes!",
    "buttons": [{"id": "approve", "title": "Setuju"}]
  }
}
```

### New Query Types

- `whatsapp_conversation_history` — recent messages with an employee
- `whatsapp_session_status` — is the employee connected, active session?

## Event Bus Events

| Event | Emitter | Description |
|-------|---------|-------------|
| `whatsapp.message.inbound` | InboundService | Employee sent a message |
| `whatsapp.message.outbound` | OutboundService | System sent a message |
| `whatsapp.delivery.failed` | InboundService | Message delivery failed |
| `whatsapp.session.started` | SessionService | New conversation started |
| `whatsapp.session.closed` | SessionService | Conversation timed out |
| `whatsapp.verification.sent` | VerificationService | OTP dispatched |
| `whatsapp.verification.confirmed` | VerificationService | Number verified |
| `whatsapp.opted_out` | VerificationService | Employee revoked opt-in |

## Database

### Employee Fields (added)

| Field | Type | Description |
|-------|------|-------------|
| `whatsapp_number` | String? | International format (e.g. 6281234567890) |
| `whatsapp_opted_in` | Boolean | Explicit consent to receive messages |
| `whatsapp_verified` | Boolean | OTP confirmed |
| `whatsapp_verified_at` | DateTime? | When verification completed |

### Tables

**`whatsapp_message_logs`** — Full audit trail (90-day retention)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | FK | Employee reference |
| direction | String | 'inbound' or 'outbound' |
| message_type | String | 'text', 'template', 'media', 'interactive', 'otp' |
| content | String | Message body |
| wa_message_id | String? | Kapso/Meta message ID |
| wa_status | String | 'sent', 'delivered', 'read', 'failed' |
| hermes_agent_id | String? | Which Hermes agent processed this |
| hermes_action_log_id | String? | Cross-reference to Hermes audit |
| session_id | FK? | Session reference |
| correlation_id | String? | Groups related messages |
| metadata | JSON? | Additional context |
| created_at | DateTime | Timestamp |

**`whatsapp_sessions`** — Conversation tracking

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | FK | Employee reference |
| started_at | DateTime | When session began |
| ended_at | DateTime? | When session closed |
| last_activity_at | DateTime | Last message time |
| message_count | Int | Messages in session |
| hermes_agent_id | String? | Handling agent |
| status | String | 'active', 'idle', 'closed' |

## Safety & Security

| Control | Implementation |
|---------|----------------|
| OTP expiry | 5 minutes |
| OTP max attempts | 3 per code |
| Daily OTP limit | 5 requests/employee/day |
| Outbound rate limit | 10 messages/employee/hour |
| Message max length | 4096 chars |
| Session timeout | 30 min inactivity → idle, 60 min → closed |
| Data retention | 90 days (auto-cleanup cron at 2:00 AM) |
| Number uniqueness | One verified number per employee |
| Webhook validation | HMAC-SHA256 signature verification |
| Content safety | Hermes safety guardrails apply to WA replies |

## Environment Variables

```env
KAPSO_API_KEY=<project API key>
KAPSO_PHONE_NUMBER_ID=597907523413541
KAPSO_BUSINESS_ACCOUNT_ID=2102230076919824
KAPSO_CONFIG_ID=31b31160-36d4-4468-92b6-2458fa6b949e
KAPSO_WEBHOOK_SECRET=<webhook signing secret>
```

## Kapso Dashboard Setup

1. Go to Kapso Dashboard → WhatsApp → Webhooks
2. Create webhook:
   - **Endpoint URL**: `https://tara.yourdomain.com/api/whatsapp/webhook`
   - **Secret key**: Same as `KAPSO_WEBHOOK_SECRET` env var
   - **Events**: `whatsapp.message.received`, `whatsapp.message.status`
3. Test the webhook connection from Kapso dashboard

## User Flow

1. Employee opens Profile → "WhatsApp Hermes"
2. Enters their WhatsApp number (international format)
3. Receives 6-digit OTP via WhatsApp
4. Enters OTP in the app → verified
5. Can now send messages to the TARA WhatsApp number
6. Hermes receives the message, processes it, replies via WhatsApp
7. Full conversation logged in `whatsapp_message_logs`

## Source Files

```
backend/src/core/hr/whatsapp/
├── controllers/
│   ├── whatsapp-webhook.controller.ts
│   └── whatsapp-settings.controller.ts
├── services/
│   ├── whatsapp-client.service.ts      (Kapso SDK wrapper)
│   ├── whatsapp-inbound.service.ts     (webhook processing)
│   ├── whatsapp-outbound.service.ts    (message sending)
│   ├── whatsapp-session.service.ts     (session management)
│   ├── whatsapp-audit.service.ts       (logging & retention)
│   └── whatsapp-verification.service.ts (OTP flow)
├── whatsapp.agent.ts                   (event-driven agent)
└── whatsapp.module.ts                  (barrel exports)
```
