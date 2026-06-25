import { Client, ConnectConfig } from 'ssh2';
import * as net from 'net';
import { HermesLogger } from './types';

/**
 * SSH Tunnel Configuration
 */
export interface SSHTunnelConfig {
  /** SSH host (TARA VPS IP or hostname) */
  sshHost: string;
  /** SSH port (default: 22) */
  sshPort?: number;
  /** SSH username */
  sshUser: string;
  /** SSH private key (string content, NOT file path) */
  sshPrivateKey?: string;
  /** SSH private key path (file path — will be read at runtime) */
  sshPrivateKeyPath?: string;
  /** SSH password (if not using key auth) */
  sshPassword?: string;
  /** Remote host to forward to (default: '127.0.0.1' — TARA's localhost) */
  remoteHost?: string;
  /** Remote port to forward to (default: 3001 — TARA's backend port) */
  remotePort?: number;
  /** Local port to bind (default: auto-assign a free port) */
  localPort?: number;
  /** Keep-alive interval in ms (default: 10000) */
  keepAliveInterval?: number;
  /** Optional logger */
  logger?: HermesLogger;
}

/**
 * SSH Tunnel Manager
 *
 * Creates an SSH tunnel from the Hermes VPS to the TARA VPS,
 * forwarding a local port to TARA's backend port through the SSH connection.
 *
 * Usage:
 * ```typescript
 * const tunnel = new SSHTunnel({
 *   sshHost: '203.0.113.50',
 *   sshUser: 'deploy',
 *   sshPrivateKeyPath: '/home/hermes/.ssh/id_ed25519',
 *   remotePort: 3001,
 * });
 *
 * const localPort = await tunnel.connect();
 * // Now use http://localhost:{localPort} as baseUrl
 *
 * // When done:
 * await tunnel.disconnect();
 * ```
 */
export class SSHTunnel {
  private sshClient: Client | null = null;
  private server: net.Server | null = null;
  private readonly config: Required<Pick<SSHTunnelConfig, 'sshHost' | 'sshPort' | 'sshUser' | 'remoteHost' | 'remotePort' | 'keepAliveInterval'>> & SSHTunnelConfig;
  private readonly logger: HermesLogger;
  private assignedPort: number | null = null;
  private isConnected = false;

  constructor(config: SSHTunnelConfig) {
    this.config = {
      sshPort: 22,
      remoteHost: '127.0.0.1',
      remotePort: 3001,
      keepAliveInterval: 10000,
      ...config,
    };
    this.logger = config.logger || console;
  }

  /**
   * Establish the SSH tunnel.
   * @returns The local port number to use as baseUrl (http://localhost:{port})
   */
  async connect(): Promise<number> {
    if (this.isConnected) {
      return this.assignedPort!;
    }

    return new Promise((resolve, reject) => {
      const sshClient = new Client();

      sshClient.on('ready', () => {
        this.logger.info(`[SSHTunnel] SSH connection established to ${this.config.sshHost}:${this.config.sshPort}`);

        // Create a local TCP server that forwards connections through SSH
        const server = net.createServer((localSocket) => {
          sshClient.forwardOut(
            '127.0.0.1',
            localSocket.localPort || 0,
            this.config.remoteHost,
            this.config.remotePort,
            (err, stream) => {
              if (err) {
                this.logger.error(`[SSHTunnel] Forward error: ${err.message}`);
                localSocket.end();
                return;
              }
              localSocket.pipe(stream).pipe(localSocket);
            },
          );
        });

        server.listen(this.config.localPort || 0, '127.0.0.1', () => {
          const address = server.address() as net.AddressInfo;
          this.assignedPort = address.port;
          this.server = server;
          this.sshClient = sshClient;
          this.isConnected = true;

          this.logger.info(
            `[SSHTunnel] Tunnel active: localhost:${this.assignedPort} → ${this.config.sshHost}:${this.config.remoteHost}:${this.config.remotePort}`,
          );

          resolve(this.assignedPort);
        });

        server.on('error', (err) => {
          this.logger.error(`[SSHTunnel] Server error: ${err.message}`);
          reject(err);
        });
      });

      sshClient.on('error', (err) => {
        this.logger.error(`[SSHTunnel] SSH error: ${err.message}`);
        this.isConnected = false;
        reject(err);
      });

      sshClient.on('close', () => {
        this.logger.warn('[SSHTunnel] SSH connection closed');
        this.isConnected = false;
      });

      // Build SSH connection config
      const connectConfig: ConnectConfig = {
        host: this.config.sshHost,
        port: this.config.sshPort,
        username: this.config.sshUser,
        keepaliveInterval: this.config.keepAliveInterval,
        keepaliveCountMax: 3,
      };

      if (this.config.sshPrivateKey) {
        connectConfig.privateKey = this.config.sshPrivateKey;
      } else if (this.config.sshPrivateKeyPath) {
        // Read key at connect time
        const fs = require('fs');
        connectConfig.privateKey = fs.readFileSync(this.config.sshPrivateKeyPath, 'utf-8');
      } else if (this.config.sshPassword) {
        connectConfig.password = this.config.sshPassword;
      } else {
        reject(new Error('SSHTunnel: Provide sshPrivateKey, sshPrivateKeyPath, or sshPassword'));
        return;
      }

      sshClient.connect(connectConfig);
    });
  }

  /**
   * Close the SSH tunnel and free resources.
   */
  async disconnect(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    if (this.sshClient) {
      this.sshClient.end();
      this.sshClient = null;
    }
    this.isConnected = false;
    this.assignedPort = null;
    this.logger.info('[SSHTunnel] Tunnel closed');
  }

  /**
   * Get the local port the tunnel is bound to.
   */
  get localPort(): number | null {
    return this.assignedPort;
  }

  /**
   * Get the base URL to use with HermesClient.
   */
  get baseUrl(): string | null {
    if (!this.assignedPort) return null;
    return `http://127.0.0.1:${this.assignedPort}`;
  }

  /**
   * Check if the tunnel is active.
   */
  get connected(): boolean {
    return this.isConnected;
  }
}
