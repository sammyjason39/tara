/**
 * Example: Hermes Agent — Auto-detects connection method
 *
 * Supports two modes:
 *   1. Direct HTTP: set TARA_URL env var
 *   2. SSH Tunnel: set TARA_SSH_HOST + TARA_SSH_USER + TARA_SSH_PASSWORD
 *
 * Run with: npx ts-node examples/basic-agent.ts
 */
import { HermesClient, SSHTunnel, TaraEvent } from '../src';

async function createClient(): Promise<{ hermes: HermesClient; tunnel?: SSHTunnel }> {
  const apiKey = process.env.HERMES_API_KEY;
  if (!apiKey) {
    throw new Error('HERMES_API_KEY is required');
  }

  // Direct HTTP mode
  if (process.env.TARA_URL) {
    console.log(`Connecting directly to ${process.env.TARA_URL}...`);
    const hermes = new HermesClient({
      baseUrl: process.env.TARA_URL,
      apiKey,
      agentId: process.env.HERMES_AGENT_ID || 'hermes-main',
    });
    return { hermes };
  }

  // SSH Tunnel mode
  if (process.env.TARA_SSH_HOST) {
    console.log(`Establishing SSH tunnel to ${process.env.TARA_SSH_HOST}...`);

    const tunnel = new SSHTunnel({
      sshHost: process.env.TARA_SSH_HOST,
      sshPort: parseInt(process.env.TARA_SSH_PORT || '22'),
      sshUser: process.env.TARA_SSH_USER || 'ubuntu',
      sshPassword: process.env.TARA_SSH_PASSWORD,
      sshPrivateKeyPath: process.env.TARA_SSH_KEY,
      remoteHost: '127.0.0.1',
      remotePort: parseInt(process.env.TARA_REMOTE_PORT || '3081'),
    });

    await tunnel.connect();
    console.log(`✓ Tunnel active on ${tunnel.baseUrl}`);

    const hermes = new HermesClient({
      baseUrl: tunnel.baseUrl!,
      apiKey,
      agentId: process.env.HERMES_AGENT_ID || 'hermes-main',
    });
    return { hermes, tunnel };
  }

  throw new Error('Set TARA_URL (direct) or TARA_SSH_HOST (tunnel) in environment');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { hermes, tunnel } = await createClient();

  // Health check
  const health = await hermes.healthCheck();
  if (!health.ok) {
    console.error('✗ Cannot reach TARA:', health.error);
    if (tunnel) await tunnel.disconnect();
    process.exit(1);
  }
  console.log(`✓ Connected to TARA (${health.latency_ms}ms)`);

  // Get capabilities
  const catalog = await hermes.getCatalog();
  console.log(`✓ Agent: ${catalog.agent_name} (${catalog.authority_level})`);
  console.log(`  ${catalog.available_actions.length} actions available`);

  // Subscribe to events
  hermes.events.on('event', handleEvent);
  hermes.events.on('connected', () => console.log('✓ Event stream connected'));
  hermes.events.on('disconnected', () => console.log('⚠ Event stream disconnected'));
  hermes.events.on('error', (err) => console.error('✗ Stream error:', err.message));

  await hermes.events.connect({
    eventTypes: ['attendance.*', 'leave.*', 'onboarding.*'],
  });

  console.log('✓ Listening for events... (Ctrl+C to stop)\n');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    hermes.events.disconnect();
    if (tunnel) await tunnel.disconnect();
    process.exit(0);
  });
}

// ─── Event Handler ────────────────────────────────────────────────────────────
async function handleEvent(event: TaraEvent) {
  console.log(`[${event.event_type}] entity=${event.entity.type}:${event.entity.id}`);

  // Add your LLM/agent logic here
}

main().catch(console.error);
