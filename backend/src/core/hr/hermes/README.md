# Hermes Agentic AI Integration

## Overview

This module provides the integration layer between TARA HR System and the **Hermes** external LLM-based agentic AI system.

**Hermes runs on a separate VPS** and connects to TARA over an SSH tunnel. See [`packages/hermes-sdk/SETUP_INSTRUCTIONS.md`](../../../packages/hermes-sdk/SETUP_INSTRUCTIONS.md) for the full setup guide.

### Deployment Architecture

```
┌─────────────────────────┐         SSH (port 22)         ┌─────────────────────────┐
│     HERMES VPS          │ ─────────────────────────────► │     TARA VPS            │
│                         │                                │     43.156.118.56       │
│  LLM Agent Code         │         Tunnel forwards        │                         │
│  + @tara/hermes-sdk     │ ◄────── localhost:3081 ──────► │  tara-backend (Docker)  │
└─────────────────────────┘                                └─────────────────────────┘
```

### Design Philosophy

- **Hermes reads events** from TARA via WebSocket (Event Stream)
- **Hermes queries data** via the Action Gateway (REST)
- **Hermes executes safe actions** (notifications, reminders, deadlines)
- **Hermes suggests decisions** for human review (leave approval, warnings, etc.)
- **Humans make all decisions** — Hermes only nudges, reminds, and informs

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        HERMES (LLM Agent)                        │
│                                                                  │
│  Reads events ←── WebSocket /event-stream                        │
│  Queries data ←── POST /api/hermes/query                         │
│  Safe actions ──→ POST /api/hermes/actions                       │
│  Suggestions ──→ POST /api/hermes/suggestions                    │
│  Event replay ←── GET /api/hermes/events/replay                  │
└──────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ HermesApiKeyGuard│  │HermesRateLimit  │  │HermesAuthority  │
│ (authentication) │  │(60 actions/hr)  │  │(read/write check)│
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SAFETY GUARDRAILS                              │
│  - Max 5 notifications per employee per day                      │
│  - No duplicate reminders within 4 hours                         │
│  - Blocked types: warning_letter, termination, disciplinary      │
│  - Max 1000 char messages                                        │
│  - Max 20 suggestions per agent per day                          │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    EXECUTORS                                      │
│  NotificationExecutor → NotificationService (existing)           │
│  FollowUpExecutor     → HermesFollowUp table + cron processor    │
│  QueryExecutor        → PrismaService (read-only queries)        │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    AUDIT & LOGGING                                │
│  HermesActionLog table — every action logged                     │
│  HermesSuggestion table — proposals with accept/reject workflow  │
└──────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### For Hermes Agents (X-Hermes-Api-Key auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hermes/actions/catalog` | Get available actions (tool list for LLM) |
| POST | `/api/hermes/actions` | Execute a safe action |
| POST | `/api/hermes/query` | Query TARA data |
| POST | `/api/hermes/suggestions` | Submit a suggestion for HR review |
| GET | `/api/hermes/events/replay` | Replay missed events |
| GET | `/api/hermes/events/audit` | View own action audit logs |
| GET | `/api/hermes/events/stats` | View daily action stats |

### For HR Team (JWT auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hermes/suggestions` | List pending suggestions |
| GET | `/api/hermes/suggestions/stats` | Suggestion statistics |
| GET | `/api/hermes/suggestions/:id` | Get single suggestion |
| PUT | `/api/hermes/suggestions/:id/accept` | Accept a suggestion |
| PUT | `/api/hermes/suggestions/:id/reject` | Reject a suggestion |

## Safe Actions (read_write authority)

| Action | Description |
|--------|-------------|
| `send_reminder` | Remind someone about a pending task |
| `send_encouragement` | Positive nudge (congrats, motivation) |
| `send_deadline_notice` | Inform about upcoming deadline |
| `send_notification` | General informational message |
| `send_bulk_reminder` | Remind multiple people at once |
| `set_follow_up` | Schedule a future reminder |

## Suggestion Actions (human review required)

| Action | Description |
|--------|-------------|
| `suggest_leave_approval` | Recommend approving a leave request |
| `suggest_leave_rejection` | Recommend rejecting a leave request |
| `suggest_warning_letter` | Recommend issuing a warning |
| `suggest_schedule_change` | Recommend schedule modification |
| `suggest_general` | General insight/recommendation |

## Authentication

```
Headers:
  X-Hermes-Api-Key: <configured API key>
  X-Hermes-Agent-Id: <optional, for multi-agent setups>
```

## Configuration

Managed via `/admin/hermes` endpoints:
- Enable/disable integration
- Set API key and webhook secret
- Register Hermes agents with authority levels
- Configure event filters (which events to forward)

## Database Tables

- `hermes_action_logs` — Audit trail of all Hermes actions
- `hermes_suggestions` — Human-in-the-loop proposals
- `hermes_follow_ups` — Scheduled future notifications

## Safety Defaults

```typescript
{
  max_notifications_per_employee_per_day: 5,
  min_reminder_interval_hours: 4,
  max_message_length: 1000,
  blocked_notification_types: ['warning_letter', 'termination_notice', 'salary_adjustment', 'disciplinary_action'],
  max_actions_per_agent_per_hour: 60,
  max_suggestions_per_agent_per_day: 20,
}
```


## Hermes SDK (for Separate VPS)

The `@tara/hermes-sdk` package (in `packages/hermes-sdk/`) provides everything needed for the Hermes VPS to connect:

```typescript
import { HermesClient, SSHTunnel } from '@tara/hermes-sdk';

const tunnel = new SSHTunnel({
  sshHost: '43.156.118.56',
  sshUser: 'ubuntu',
  sshPassword: process.env.TARA_SSH_PASSWORD,
  remotePort: 3081,
});
await tunnel.connect();

const hermes = new HermesClient({
  baseUrl: tunnel.baseUrl!,
  apiKey: process.env.HERMES_API_KEY,
});

// Query, execute actions, listen to events
await hermes.events.connect({ eventTypes: ['attendance.*', 'leave.*'] });
```

### SDK Documentation

- **README:** [`packages/hermes-sdk/README.md`](../../../packages/hermes-sdk/README.md)
- **Setup Guide:** [`packages/hermes-sdk/SETUP_INSTRUCTIONS.md`](../../../packages/hermes-sdk/SETUP_INSTRUCTIONS.md)
- **Examples:** [`packages/hermes-sdk/examples/`](../../../packages/hermes-sdk/examples/)

## VPS Information

| Setting | Value |
|---------|-------|
| TARA Host | `43.156.118.56` |
| SSH Port | `22` |
| SSH User | `ubuntu` |
| SSH Auth | Password |
| Backend Port (Docker published) | `3081` |
| Backend Port (container internal) | `3001` |
| Frontend Port | `3080` |
| Database Port | `5488` |
| Redis Port | `6388` |
