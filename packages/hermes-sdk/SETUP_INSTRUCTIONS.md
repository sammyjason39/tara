# Hermes Integration — Setup Instructions

## Overview

Hermes (the AI agent) runs on its own VPS and connects to the TARA backend via SSH tunnel. The TARA backend already has all the Hermes endpoints built in. You just need to enable them and set up the Hermes side.

```
┌─────────────────────────┐         SSH (port 22)         ┌─────────────────────────┐
│     HERMES VPS          │ ─────────────────────────────► │     TARA VPS            │
│                         │                                │     43.156.118.56       │
│  Your LLM Agent Code    │         Tunnel forwards        │                         │
│  + @tara/hermes-sdk     │ ◄────── localhost:3081 ──────► │  tara-backend (Docker)  │
└─────────────────────────┘                                └─────────────────────────┘
```

---

## Part 1: TARA VPS Setup

### File to change

| File | Location on VPS |
|------|-----------------|
| `.env` | In the TARA project root (same directory as `docker-compose.yml`) |

### What to change

Open the `.env` file and set:

```env
HERMES_ENABLED=true
HERMES_API_KEY=generate-a-strong-random-key-here
```

> **Generate a key:** run `openssl rand -hex 32` to get a secure random key.

### Restart the backend

```bash
cd /path/to/tara
docker compose restart backend
```

### Verify it works

```bash
curl -H "X-Hermes-Api-Key: YOUR_KEY_HERE" http://localhost:3081/hermes/actions/catalog
```

You should get a JSON response with `available_actions`. If you get 401 or 403, double-check the key matches.

---

## Part 2: Hermes VPS Setup

### Project structure

Create this structure on the Hermes VPS:

```
hermes-agent/
├── hermes-sdk/          ← copied from project-tara/packages/hermes-sdk
├── src/
│   └── index.ts         ← your agent entry point
├── .env                 ← credentials
├── package.json
└── tsconfig.json
```

### Step 1: Copy the SDK

From the project-tara repo, copy the entire `packages/hermes-sdk/` folder into your Hermes project:

```bash
# On your local machine or via git
cp -r project-tara/packages/hermes-sdk ./hermes-agent/hermes-sdk/
```

### Step 2: Create `package.json`

```json
{
  "name": "hermes-agent",
  "private": true,
  "scripts": {
    "start": "ts-node src/index.ts",
    "dev": "ts-node-dev --respawn src/index.ts"
  },
  "dependencies": {
    "@tara/hermes-sdk": "file:./hermes-sdk",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "ts-node": "^10.9.0",
    "@types/node": "^20.0.0"
  }
}
```

### Step 3: Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

### Step 4: Create `.env`

```env
# SSH connection to TARA VPS
TARA_SSH_HOST=43.156.118.56
TARA_SSH_PORT=22
TARA_SSH_USER=ubuntu
TARA_SSH_PASSWORD=<the-ssh-password>
TARA_REMOTE_PORT=3081

# Must match HERMES_API_KEY on the TARA VPS
HERMES_API_KEY=<same-key-you-set-on-tara>

# Agent identity
HERMES_AGENT_ID=hermes-main
```

### Step 5: Create `src/index.ts`

```typescript
import 'dotenv/config';
import { HermesClient, SSHTunnel, TaraEvent } from '@tara/hermes-sdk';

async function main() {
  // 1. Create SSH tunnel to TARA
  const tunnel = new SSHTunnel({
    sshHost: process.env.TARA_SSH_HOST!,
    sshPort: parseInt(process.env.TARA_SSH_PORT || '22'),
    sshUser: process.env.TARA_SSH_USER!,
    sshPassword: process.env.TARA_SSH_PASSWORD,
    remotePort: parseInt(process.env.TARA_REMOTE_PORT || '3081'),
  });

  await tunnel.connect();
  console.log(`✓ SSH tunnel active: ${tunnel.baseUrl}`);

  // 2. Create Hermes client
  const hermes = new HermesClient({
    baseUrl: tunnel.baseUrl!,
    apiKey: process.env.HERMES_API_KEY!,
    agentId: process.env.HERMES_AGENT_ID || 'hermes-main',
  });

  // 3. Verify connection
  const health = await hermes.healthCheck();
  if (!health.ok) {
    console.error('✗ Cannot reach TARA:', health.error);
    await tunnel.disconnect();
    process.exit(1);
  }
  console.log(`✓ Connected to TARA (${health.latency_ms}ms)`);

  // 4. Show what tools are available
  const catalog = await hermes.getCatalog();
  console.log(`✓ Agent: ${catalog.agent_name} (${catalog.authority_level})`);
  console.log(`  ${catalog.available_actions.length} actions available`);

  // 5. Subscribe to real-time events
  hermes.events.on('event', (event: TaraEvent) => {
    console.log(`[${event.event_type}]`, event.entity);
    // ─── ADD YOUR LLM/AGENT LOGIC HERE ───
  });

  hermes.events.on('connected', () => console.log('✓ Event stream connected'));
  hermes.events.on('disconnected', () => console.log('⚠ Event stream disconnected'));
  hermes.events.on('error', (err) => console.error('✗ Stream error:', err.message));

  await hermes.events.connect({
    eventTypes: ['attendance.*', 'leave.*', 'onboarding.*'],
  });

  console.log('✓ Listening for events... (Ctrl+C to stop)\n');

  // 6. Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    hermes.events.disconnect();
    await tunnel.disconnect();
    console.log('✓ Done.');
    process.exit(0);
  });
}

main().catch(console.error);
```

### Step 6: Install and run

```bash
cd hermes-agent
npm install
npm start
```

Expected output:
```
✓ SSH tunnel active: http://127.0.0.1:54321
✓ Connected to TARA (87ms)
✓ Agent: Hermes AI (read_write)
  18 actions available
✓ Event stream connected
✓ Listening for events...
```

---

## Part 3: Available SDK Methods

### Querying Data

```typescript
// Get employee info
const emp = await hermes.getEmployee('employee-uuid');

// Get today's attendance
const attendance = await hermes.getAttendanceStatus();

// Get specific employee attendance history
const history = await hermes.getAttendanceHistory('employee-uuid', '2026-06-01', '2026-06-26');

// Get leave balance
const balance = await hermes.getLeaveBalance('employee-uuid');

// Get all pending leave requests
const pending = await hermes.getPendingLeaveRequests();

// Get department summary
const dept = await hermes.getDepartmentSummary('department-uuid');

// Generic query (any query type)
const result = await hermes.query('onboarding_status', { employee_id: 'uuid' });
```

### Executing Safe Actions

```typescript
// Send a reminder
await hermes.sendReminder('employee-uuid', 'Timesheet Due', 'Please submit by Friday 5pm.');

// Send encouragement
await hermes.sendEncouragement('employee-uuid', 'Great work!', 'Perfect attendance this month!');

// Send deadline notice
await hermes.sendDeadlineNotice('employee-uuid', 'Leave approval needed', 'Pending request expires tomorrow.', '2026-07-01T17:00:00Z', 'high');

// Send general notification
await hermes.sendNotification('employee-uuid', 'Update', 'Your schedule has been updated.');

// Send to multiple people
await hermes.sendBulkReminder(['uuid-1', 'uuid-2', 'uuid-3'], 'Team Meeting', 'Stand-up in 15 minutes.');

// Schedule a future reminder
await hermes.setFollowUp('employee-uuid', 'Check in', 'How is your first week going?', '2026-07-03T09:00:00Z');

// Reply via WhatsApp
await hermes.sendWhatsAppReply('employee-uuid', 'Your leave request has been received.');
```

### Submitting Suggestions (Human Review Required)

```typescript
// Suggest approving a leave request
await hermes.suggestLeaveApproval('leave-request-uuid', 'Employee has 15 days remaining, requesting 2. No conflicts.', 0.92);

// Suggest rejecting a leave request
await hermes.suggestLeaveRejection('leave-request-uuid', 'Department already has 3 people on leave that week.', 0.85);

// General suggestion
await hermes.suggestGeneral('Consider shift adjustment for Employee X', 'They have been consistently arriving 30 min early for 3 months.', {
  target_entity_id: 'employee-uuid',
  entity_type: 'employee',
  confidence: 0.75,
});
```

### Event Stream

```typescript
// Subscribe to specific event types
hermes.events.on('event', (event) => {
  switch (event.event_type) {
    case 'attendance.tardiness_detected':
      // Handle tardiness
      break;
    case 'leave.request.submitted':
      // Handle new leave request
      break;
  }
});

await hermes.events.connect({
  eventTypes: ['attendance.*', 'leave.*', 'onboarding.*'],
});

// Change subscription without reconnecting
hermes.events.subscribe(['attendance.*', 'leave.*', 'report.*']);
```

### Catching Up After Disconnect

```typescript
// Replay events you missed
const missed = await hermes.replayEvents({
  since: '2026-06-25T08:00:00Z',
  types: ['attendance.*'],
  limit: 500,
});

console.log(`Missed ${missed.count} events`);
for (const event of missed.events) {
  // Process each missed event
}
```

---

## Part 4: Troubleshooting

| Problem | Solution |
|---------|----------|
| `SSH error: Authentication failed` | Check `TARA_SSH_PASSWORD` in `.env` |
| `Cannot reach TARA: Unauthorized` | `HERMES_API_KEY` doesn't match between `.env` files |
| `Cannot reach TARA: Hermes integration is disabled` | Set `HERMES_ENABLED=true` on TARA VPS and restart backend |
| `SSH tunnel closed unexpectedly` | The SDK auto-reconnects. Check TARA VPS SSH service is running |
| `Rate limit exceeded` | Default: 60 actions/hour/agent. Wait or reduce action frequency |
| `Daily notification limit reached` | Max 5 notifications per employee per day (safety limit) |

---

## Part 5: Security Notes

- **API Key**: Use a strong random key (32+ chars). Never commit to git.
- **SSH Password**: Consider switching to SSH key auth for production. Generate a key pair on the Hermes VPS and add the public key to TARA's `~/.ssh/authorized_keys`.
- **Safety Guardrails**: Built into the backend — Hermes cannot send warning letters, termination notices, or spam employees. Max 5 notifications per employee per day.
- **All actions are logged**: Every action Hermes takes is recorded in `hermes_action_logs` table.

---

## Checklist

- [ ] TARA VPS: Set `HERMES_ENABLED=true` in `.env`
- [ ] TARA VPS: Set `HERMES_API_KEY=<strong-key>` in `.env`
- [ ] TARA VPS: `docker compose restart backend`
- [ ] TARA VPS: Verify with curl (should return catalog JSON)
- [ ] Hermes VPS: Copy `hermes-sdk/` folder
- [ ] Hermes VPS: Create project files (package.json, tsconfig, .env, src/index.ts)
- [ ] Hermes VPS: Set same `HERMES_API_KEY` in `.env`
- [ ] Hermes VPS: Set SSH credentials in `.env`
- [ ] Hermes VPS: `npm install && npm start`
- [ ] Verify: should see "✓ Connected" and "✓ Listening for events"
