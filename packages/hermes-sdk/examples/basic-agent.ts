/**
 * Example: Basic Hermes Agent
 *
 * This shows the minimal code needed on the Hermes VPS to connect
 * to a TARA backend and start processing events + executing actions.
 *
 * Run with: npx ts-node examples/basic-agent.ts
 */
import { HermesClient, TaraEvent } from '../src';

// ─── Configuration ────────────────────────────────────────────────────────────
const hermes = new HermesClient({
  baseUrl: process.env.TARA_URL || 'http://localhost:3001',
  apiKey: process.env.HERMES_API_KEY || 'your-api-key',
  agentId: 'hermes-main',
});

// ─── Main Agent Loop ──────────────────────────────────────────────────────────
async function main() {
  // 1. Health check
  const health = await hermes.healthCheck();
  if (!health.ok) {
    console.error('Cannot reach TARA:', health.error);
    process.exit(1);
  }
  console.log(`✓ Connected to TARA (${health.latency_ms}ms)`);

  // 2. Get our capabilities
  const catalog = await hermes.getCatalog();
  console.log(`✓ Agent: ${catalog.agent_name} (${catalog.authority_level})`);
  console.log(`  ${catalog.available_actions.length} actions available`);

  // 3. Subscribe to real-time events
  hermes.events.on('event', handleEvent);
  hermes.events.on('connected', () => console.log('✓ Event stream connected'));
  hermes.events.on('disconnected', () => console.log('⚠ Event stream disconnected'));
  hermes.events.on('error', (err) => console.error('✗ Stream error:', err.message));

  await hermes.events.connect({
    eventTypes: ['attendance.*', 'leave.*', 'onboarding.*'],
  });

  console.log('✓ Listening for events... (Ctrl+C to stop)');
}

// ─── Event Handler ────────────────────────────────────────────────────────────
async function handleEvent(event: TaraEvent) {
  console.log(`[EVENT] ${event.event_type} | entity: ${event.entity.type}:${event.entity.id}`);

  switch (event.event_type) {
    case 'attendance.tardiness_detected':
      await handleTardiness(event);
      break;

    case 'leave.request.submitted':
      await handleLeaveRequest(event);
      break;

    case 'onboarding.workflow_completed':
      await handleOnboardingComplete(event);
      break;
  }
}

// ─── Business Logic ───────────────────────────────────────────────────────────

async function handleTardiness(event: TaraEvent) {
  const { employee_id, tardiness_minutes } = event.payload;

  if (tardiness_minutes > 30) {
    // Check attendance history
    const history = await hermes.getAttendanceHistory(employee_id);
    const recentTardies = history.data?.tardy_days || 0;

    if (recentTardies >= 3) {
      // Suggest a warning letter
      await hermes.suggestGeneral(
        `Chronic tardiness: ${recentTardies} late days this month`,
        `Employee has been late ${recentTardies} times in the past 30 days, most recently by ${tardiness_minutes} minutes. Consider issuing a verbal warning.`,
        { target_entity_id: employee_id, entity_type: 'employee', confidence: 0.8 },
      );
    } else {
      // Just send a gentle reminder
      await hermes.sendReminder(
        employee_id,
        'Attendance reminder',
        `You were ${tardiness_minutes} minutes late today. Please try to arrive on time.`,
      );
    }
  }
}

async function handleLeaveRequest(event: TaraEvent) {
  const { leave_request_id, employee_id, total_days } = event.payload;

  // Get employee balance
  const balance = await hermes.getLeaveBalance(employee_id);
  const remaining = balance.data?.balance?.remaining_days || 0;

  if (remaining >= total_days) {
    await hermes.suggestLeaveApproval(
      leave_request_id,
      `Employee has ${remaining} days remaining, requesting ${total_days}. Sufficient balance.`,
      0.9,
    );
  }
}

async function handleOnboardingComplete(event: TaraEvent) {
  const { employee_id } = event.payload;

  await hermes.sendEncouragement(
    employee_id,
    'Welcome aboard! 🎉',
    'Congratulations on completing your onboarding! We are thrilled to have you on the team.',
    'welcome',
  );
}

// ─── Start ────────────────────────────────────────────────────────────────────
main().catch(console.error);
