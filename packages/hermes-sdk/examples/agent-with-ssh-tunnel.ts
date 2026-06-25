/**
 * Example: Hermes Agent connecting through SSH Tunnel
 *
 * TARA VPS Settings (as discovered):
 *   - Host: 43.156.118.56
 *   - SSH port: 22, user: ubuntu, auth: password
 *   - Backend exposed on port 3081 (container internal 3001)
 *   - UFW inactive (but cloud firewall may block non-SSH ports)
 *
 * The SDK creates an SSH tunnel and routes all HTTP/WebSocket through it.
 *
 * Environment variables:
 *   TARA_SSH_HOST=43.156.118.56
 *   TARA_SSH_USER=ubuntu
 *   TARA_SSH_PASSWORD=your-ssh-password
 *   HERMES_API_KEY=your-api-key
 *
 * Run with: npx ts-node examples/agent-with-ssh-tunnel.ts
 */
import { HermesClient, SSHTunnel, TaraEvent } from '../src';

async function main() {
  // ─── 1. Create SSH Tunnel ──────────────────────────────────────────────────
  //
  // Two options for remotePort:
  //   - 3081: connects to backend via the host's published port (goes through Docker NAT)
  //   - 3001: connects directly to the container's internal port (only if on Docker network)
  //
  // Use 3081 since we're tunneling to the host, not into the container network.
  //
  console.log('Establishing SSH tunnel to TARA VPS...');

  const tunnel = new SSHTunnel({
    sshHost: process.env.TARA_SSH_HOST || '43.156.118.56',
    sshPort: 22,
    sshUser: process.env.TARA_SSH_USER || 'ubuntu',
    sshPassword: process.env.TARA_SSH_PASSWORD,
    // Or use key auth:
    // sshPrivateKeyPath: process.env.TARA_SSH_KEY || `${process.env.HOME}/.ssh/id_ed25519`,
    remoteHost: '127.0.0.1',  // localhost on the TARA VPS
    remotePort: 3081,          // backend's published port on the host
  });

  const localPort = await tunnel.connect();
  console.log(`✓ SSH tunnel active: localhost:${localPort} → 43.156.118.56:3081`);

  // ─── 2. Create Hermes Client (routes through tunnel) ──────────────────────
  const hermes = new HermesClient({
    baseUrl: tunnel.baseUrl!,  // e.g., "http://127.0.0.1:54321"
    apiKey: process.env.HERMES_API_KEY || 'your-api-key',
    agentId: 'hermes-main',
  });

  // ─── 3. Verify Connection ─────────────────────────────────────────────────
  const health = await hermes.healthCheck();
  if (!health.ok) {
    console.error('✗ Cannot reach TARA through tunnel:', health.error);
    await tunnel.disconnect();
    process.exit(1);
  }
  console.log(`✓ TARA reachable (${health.latency_ms}ms through SSH)`);

  // ─── 4. Normal Agent Operations ───────────────────────────────────────────
  const catalog = await hermes.getCatalog();
  console.log(`✓ Agent: ${catalog.agent_name} | ${catalog.available_actions.length} actions available`);

  // Subscribe to real-time events through the tunnel
  hermes.events.on('event', (event: TaraEvent) => {
    console.log(`[EVENT] ${event.event_type} | ${event.entity.type}:${event.entity.id}`);
  });

  hermes.events.on('error', (err) => {
    console.error('[STREAM ERROR]', err.message);
  });

  await hermes.events.connect({
    eventTypes: ['attendance.*', 'leave.*', 'onboarding.*'],
  });

  console.log('✓ Event stream connected (through SSH tunnel)');
  console.log('  Listening... Press Ctrl+C to stop.\n');

  // ─── 5. Graceful Shutdown ─────────────────────────────────────────────────
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    hermes.events.disconnect();
    await tunnel.disconnect();
    console.log('✓ Tunnel closed. Goodbye.');
    process.exit(0);
  });
}

main().catch(async (err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
