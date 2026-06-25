# Autonomous Agents

TARA operates 8 autonomous agents that handle HR tasks 24/7 without manual intervention. All agents can be enabled/disabled via the Settings page.

## Agent Overview

| # | Agent | Trigger | Output | SLA |
|---|-------|---------|--------|-----|
| 1 | Leave Request Agent | Employee submits leave | Validate balance → Notify supervisor → Update balance | 5 minutes |
| 2 | Absensi Agent | Clock-in/out API call | Record attendance → Detect tardiness → Trigger Late Report | Real-time |
| 3 | Clock Confirmation Agent | Event: `attendance.clock_in/out` | Send private confirmation notification | 30 seconds |
| 4 | Weekly Checkin Agent | Cron: Friday 16:00 WIB | Distribute form → Collect → Monday report | Scheduled |
| 5 | Late Report Agent | Cron: Daily 09:05 WIB | Query tardy → Public announcement + HR recap | 2 minutes |
| 6 | Onboarding Agent | New employee created | Execute 7-step workflow | 2 hours |
| 7 | Saldo Cuti Agent | Balance query / Monthly cron | Real-time balance + monthly recap | 5 seconds |
| 8 | SOP Agent | SOP CRUD actions + Hermes queries | Emit lifecycle events → Provide SOP context to Hermes | Real-time |
| 9 | WhatsApp Agent | Webhook: inbound message / Hermes reply | Route WA ↔ Hermes, session mgmt, audit logging | Real-time |

## Agent Architecture

Each agent is a NestJS `@Injectable()` service with:
- **Health check** — reports status to agent config dashboard
- **Event emission** — publishes to Event Bus after every action
- **Configuration** — reads from `agent_configs` table
- **Error handling** — logs errors, notifies HR on failure
- **Scheduled tasks** — `@Cron()` decorators for time-based execution

## Event Flow

```
User Action → Service → Event Bus → Agent(s) → Notification → User
```

Example: Clock-In
```
Employee taps Clock In
  → POST /attendance/clock-in
    → TaraAttendanceService.recordClockIn()
      → EventBus.emit('attendance.clock_in')
        → ClockConfirmationAgent listens → sends private notification
        → LateReportAgent listens → logs tardiness for daily report
        → Hermes AI consumes event (if configured)
```

## Detailed Agent Descriptions

### 1. Leave Request Agent (`leave-request.agent.ts`)
- Validates leave days against employee's LeaveBalance
- Notifies supervisor for approval within 5 minutes
- Updates balance on approval
- Supports: annual, sick, emergency, unpaid leave

### 2. Absensi Agent (`absensi.agent.ts`)
- Processes clock-in/out with GPS validation
- Calculates tardiness based on configurable threshold
- Runs status cache update every 5 minutes (07:00-18:00, Mon-Fri)
- Checks missing clock-outs at 18:00 daily

### 3. Clock Confirmation Agent (`clock-confirmation.agent.ts`)
- Listens to `attendance.clock_in` and `attendance.clock_out` events
- Sends private Indonesian-language confirmation to employee
- Includes timestamp (WIB), name, and tardiness status
- Tracks 30-second SLA compliance

### 4. Weekly Checkin Agent (`weekly-checkin.agent.ts`)
- Distributes productivity form every Friday 16:00 WIB
- Collects: accomplishments, challenges, next week goals
- Generates Monday 08:00 summary report for HR + Supervisors
- Sends reminders for non-submissions

### 5. Late Report Agent (`late-report.agent.ts`)
- Runs at 09:05 WIB (Mon-Fri), skips weekends and holidays
- Queries all tardy attendance records for the day
- Sends public announcement (all employees see who's late)
- Sends detailed recap to HR team
- If no tardiness: sends positive acknowledgment

### 6. Onboarding Agent (`onboarding.agent.ts`)
- 7-step workflow: Email → Welcome Kit → Orientation → Team Intro → Tools → SOP → Contract
- Tracks each step status (pending/in_progress/completed/failed)
- Notifies HR on completion or failure
- Target: complete within 2 hours

### 7. Saldo Cuti Agent (`saldo-cuti.agent.ts`)
- Real-time balance queries (< 5 seconds)
- Monthly recap on 1st day at 08:00 WIB
- Shows: remaining days, used days, total entitlement, upcoming leaves
- Private to requesting employee

### 8. SOP Agent (`sop-agent.service.ts`)
- Tracks and emits events for all SOP document lifecycle actions
- Provides SOP catalog context to Hermes AI for knowledge-aware responses
- Enables audit trail of all document changes via Event Bus persistence

**Events Emitted:**

| Event Type | Trigger |
|---|---|
| `sop.document.uploaded` | Single PDF uploaded |
| `sop.document.bulk_uploaded` | Multiple PDFs uploaded at once |
| `sop.document.updated` | Metadata edited (title, description, category) |
| `sop.document.deleted` | Document removed |
| `sop.document.viewed` | Document accessed/downloaded |
| `sop.catalog.response` | Response to Hermes catalog query |
| `sop.context.provided` | SOP awareness context sent to Hermes |

**Events Listened:**

| Event Type | Action |
|---|---|
| `hermes.query.sop_catalog` | Returns full SOP document catalog to Hermes |
| `hermes.context.requested` | Provides SOP awareness when topic is SOP/prosedur related |

**Hermes Integration:**
- When Hermes receives a question about company procedures, it emits `hermes.query.sop_catalog`
- The SOP Agent responds with all active documents (titles, descriptions, categories, download URLs)
- Hermes can then reference specific SOPs in its responses to employees

## Configuration

Agents are configured via `Settings > Agen Otonom` or the `agent_configs` table:

```json
{
  "agent_name": "leave_request",
  "is_enabled": true,
  "configuration": { "auto_approve_sick_leave": false },
  "health_status": "healthy"
}
```

## Manual Override

All automated actions can be performed manually by HR:
- HR can approve/reject leaves directly
- HR can record attendance manually (override geo-fence)
- HR can send notifications manually
- HR can process onboarding steps manually

## Hermes AI — The 9th Agent (External, LLM-based)

In addition to the 7 deterministic internal agents, TARA supports an external LLM-based agent called **Hermes**. Unlike the internal agents, Hermes uses AI reasoning.

### How Hermes Works

1. **Observes** — connects via WebSocket to the Event Stream, receives all domain events in real-time
2. **Queries** — uses `POST /v1/hermes/query` to read employee data, attendance, leave balances, etc.
3. **Acts (safe only)** — sends reminders, encouragement, deadline notices via `POST /v1/hermes/actions`
4. **Suggests (decisions)** — proposes leave approvals, warnings, etc. via `POST /v1/hermes/suggestions` for HR to review

### Safety Boundaries

| What Hermes CAN do | What Hermes CANNOT do |
|--------------------|-----------------------|
| Send reminders to employees/supervisors | Approve or reject leave |
| Send encouragement messages | Issue warning letters |
| Send deadline notices | Change employee data |
| Schedule follow-up notifications | Modify attendance records |
| Query any data (read-only) | Process payroll |
| Suggest actions for HR review | Execute any decision |

### Configuration

Hermes is configured via `Settings > Hermes AI` or the admin API:
- Enable/disable the integration
- Set API key for authentication
- Register Hermes agents with authority levels (`read_only` or `read_write`)
- Configure which events are forwarded

See full documentation: [`backend/src/core/hr/hermes/README.md`](../backend/src/core/hr/hermes/README.md)

## WhatsApp Agent — Hermes Communication Channel

The WhatsApp Agent enables bidirectional messaging between employees and Hermes AI via their personal WhatsApp. Powered by [Kapso](https://kapso.com) WhatsApp Business API.

### How It Works

1. Employee sets their WhatsApp number in Profile → verifies via OTP
2. Employee sends a message to the TARA WhatsApp number
3. Webhook receives → InboundService identifies employee → emits `whatsapp.message.inbound` event
4. Hermes observes the event, queries conversation history for context
5. Hermes calls `send_whatsapp_reply` action → WhatsApp Agent delivers the reply
6. Everything logged in `whatsapp_message_logs` with audit cross-references

### Key Features

- **OTP Verification** — 6-digit code sent via WhatsApp, 5-min expiry
- **Session Tracking** — auto-timeout after 30 min inactivity
- **Rate Limiting** — max 10 outbound messages/employee/hour
- **90-Day Retention** — auto-cleanup via daily cron
- **Event Bus Integration** — 8 event types for full observability
- **Notification Forwarding** — important system notifications also sent to WhatsApp

### Source

```
backend/src/core/hr/whatsapp/
├── controllers/        (webhook + self-service API)
├── services/           (client, inbound, outbound, session, audit, verification)
└── whatsapp.agent.ts   (event-driven bridge)
```

See full documentation: [`docs/WHATSAPP_AGENT.md`](./WHATSAPP_AGENT.md)
