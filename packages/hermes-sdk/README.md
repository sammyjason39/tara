# @tara/hermes-sdk

Lightweight TypeScript SDK for Hermes AI agents to connect to any TARA-compatible backend over the network.

**Hermes runs on a separate VPS. This SDK is what it uses to talk to your app.**

## Install

```bash
npm install @tara/hermes-sdk
# or just copy the packages/hermes-sdk folder into your Hermes project
```

## Connection Methods

### Direct HTTP (if ports are open between VPSes)

```typescript
import { HermesClient } from '@tara/hermes-sdk';

const hermes = new HermesClient({
  baseUrl: 'http://43.156.118.56:3081',
  apiKey: 'your-hermes-api-key',
  agentId: 'hermes-main',
});
```

### SSH Tunnel (when only port 22 is reachable)

```typescript
import { HermesClient, SSHTunnel } from '@tara/hermes-sdk';

// 1. Create tunnel
const tunnel = new SSHTunnel({
  sshHost: '43.156.118.56',
  sshPort: 22,
  sshUser: 'ubuntu',
  sshPassword: process.env.TARA_SSH_PASSWORD,
  remotePort: 3081,  // TARA backend port on the VPS
});

const localPort = await tunnel.connect();
// Tunnel active: localhost:{localPort} → 43.156.118.56:3081

// 2. Use the tunnel URL
const hermes = new HermesClient({
  baseUrl: tunnel.baseUrl!,  // http://127.0.0.1:{localPort}
  apiKey: 'your-hermes-api-key',
  agentId: 'hermes-main',
});

// 3. Everything works the same from here
const health = await hermes.healthCheck();
await hermes.events.connect({ eventTypes: ['attendance.*'] });

// 4. Cleanup on shutdown
process.on('SIGINT', async () => {
  hermes.events.disconnect();
  await tunnel.disconnect();
});
```

## Quick Start

```typescript
import { HermesClient } from '@tara/hermes-sdk';

const hermes = new HermesClient({
  baseUrl: 'https://tara.yourcompany.com',  // Your TARA backend URL
  apiKey: 'your-hermes-api-key',            // Matches HERMES_API_KEY on TARA
  agentId: 'hermes-main',                   // Optional: for multi-agent setups
});

// 1. Check connection
const health = await hermes.healthCheck();
console.log(health); // { ok: true, latency_ms: 45 }

// 2. Get available tools (catalog)
const catalog = await hermes.getCatalog();
console.log(`${catalog.available_actions.length} actions available`);

// 3. Query data
const employee = await hermes.getEmployee('emp-uuid');
const attendance = await hermes.getAttendanceStatus();
const leaves = await hermes.getPendingLeaveRequests();

// 4. Execute safe actions
await hermes.sendReminder('emp-uuid', 'Timesheet Due', 'Please submit by Friday 5pm.');
await hermes.sendEncouragement('emp-uuid', 'Great work!', 'You had perfect attendance this month.');
await hermes.setFollowUp('emp-uuid', 'Check in', 'How is the onboarding going?', '2026-07-01T09:00:00Z');

// 5. Submit suggestions for HR review
await hermes.suggestLeaveApproval('leave-req-uuid', 'Employee has sufficient balance and no conflicts.', 0.92);

// 6. Listen to real-time events
hermes.events.on('event', (event) => {
  console.log(`[${event.event_type}]`, event.payload);
});
await hermes.events.connect({ eventTypes: ['attendance.*', 'leave.*'] });
```

## Architecture

```
┌─────────────────────────────────────────┐
│         HERMES VPS                      │
│                                         │
│  Your LLM Agent Code                    │
│     └── HermesClient (this SDK)         │
│           ├── HTTP → REST API           │
│           └── WebSocket → Event Stream  │
└─────────────────────────────────────────┘
              │ HTTPS / WSS
              ▼
┌─────────────────────────────────────────┐
│         TARA VPS (or any host app)      │
│                                         │
│  /hermes/actions/catalog    (GET)       │
│  /hermes/actions            (POST)      │
│  /hermes/query              (POST)      │
│  /hermes/suggestions        (POST/GET)  │
│  /hermes/events/replay      (GET)       │
│  /event-stream              (WebSocket) │
└─────────────────────────────────────────┘
```

## API Reference

### Constructor

```typescript
const hermes = new HermesClient({
  baseUrl: 'https://tara.example.com',  // Required
  apiKey: 'your-api-key',               // Required
  agentId: 'agent-id',                  // Optional
  timeout: 30000,                        // Optional (ms)
  retry: { maxRetries: 3, backoffMs: 1000 }, // Optional
  logger: customLogger,                  // Optional (defaults to console)
});
```

### Actions

| Method | Description |
|--------|-------------|
| `execute(action, params)` | Execute any safe action |
| `sendReminder(id, title, msg)` | Send a reminder |
| `sendEncouragement(id, title, msg)` | Send encouragement |
| `sendDeadlineNotice(id, title, msg, deadline)` | Send deadline notice |
| `sendNotification(id, title, msg)` | Send general notification |
| `sendBulkReminder(ids, title, msg)` | Remind multiple people |
| `setFollowUp(id, title, msg, scheduledAt)` | Schedule future reminder |
| `sendWhatsAppReply(id, msg, buttons?)` | Reply via WhatsApp |

### Queries

| Method | Description |
|--------|-------------|
| `query(type, params)` | Execute any query |
| `getEmployee(id)` | Get employee info |
| `getAttendanceStatus(id?, date?)` | Today's attendance |
| `getAttendanceHistory(id, from?, to?)` | Attendance over time |
| `getLeaveBalance(id)` | Leave balance |
| `getPendingLeaveRequests(empId?, deptId?)` | Pending leaves |
| `getDepartmentSummary(deptId?)` | Department overview |

### Suggestions

| Method | Description |
|--------|-------------|
| `suggest(payload)` | Submit any suggestion |
| `suggestLeaveApproval(id, reasoning, confidence?)` | Suggest approving leave |
| `suggestLeaveRejection(id, reasoning, confidence?)` | Suggest rejecting leave |
| `suggestGeneral(title, reasoning)` | General suggestion |

### Event Stream

| Method | Description |
|--------|-------------|
| `events.connect(options?)` | Connect to WebSocket |
| `events.disconnect()` | Disconnect |
| `events.subscribe(types)` | Update subscriptions |
| `events.on('event', handler)` | Handle events |
| `events.on('connected', handler)` | Connection callback |
| `events.on('disconnected', handler)` | Disconnection callback |
| `events.on('error', handler)` | Error callback |
| `events.connected` | Check connection status |

### Event Replay

```typescript
// Catch up on missed events after reconnection
const missed = await hermes.replayEvents({
  since: '2026-06-25T08:00:00Z',
  types: ['attendance.*'],
  limit: 500,
});
```

### Error Handling

```typescript
import { HermesApiError } from '@tara/hermes-sdk';

try {
  await hermes.sendReminder('bad-id', 'Test', 'Test');
} catch (err) {
  if (err instanceof HermesApiError) {
    console.log(err.statusCode); // 400, 401, 403, 429
    console.log(err.response);   // Full error response body
  }
}
```

## What the Host App Needs

Your TARA backend (or any host app) needs:

1. **The Hermes endpoints** (already built into project-tara via `HermesModule.forRoot()`)
2. **Environment variables**: `HERMES_ENABLED=true`, `HERMES_API_KEY=<same key>`
3. **WebSocket** `/event-stream` namespace (already built in project-tara)
4. **Network access**: Hermes VPS must be able to reach TARA's port

That's it. No shared code, no NestJS modules to import on the Hermes side.

## Integration for Other Apps (project-hug, etc.)

If you want to connect Hermes to a *new* app (not project-tara), the app needs to expose the same REST endpoints. The easiest way:

1. Add `HermesModule.forRoot(...)` to your NestJS app (see `INTEGRATION_GUIDE.md` in the hermes folder)
2. Set `HERMES_API_KEY` env var
3. Point this SDK at that app's URL

The SDK doesn't care which backend it talks to — it just needs the Hermes REST contract.
