import { io, Socket } from 'socket.io-client';
import {
  HermesSDKConfig,
  HermesLogger,
  EventStreamOptions,
  EventHandler,
  ConnectionHandler,
  ErrorHandler,
  TaraEvent,
} from './types';

/**
 * Event Stream Client
 *
 * Connects to TARA's WebSocket event stream and receives real-time domain events.
 * Handles reconnection, subscription management, and event delivery.
 *
 * Usage:
 * ```typescript
 * const stream = new EventStream(config);
 *
 * stream.on('event', (event) => {
 *   console.log('Received:', event.event_type);
 * });
 *
 * await stream.connect({ eventTypes: ['attendance.*', 'leave.*'] });
 * ```
 */
export class EventStream {
  private socket: Socket | null = null;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly agentId?: string;
  private readonly logger: HermesLogger;

  private eventHandlers: EventHandler[] = [];
  private connectHandlers: ConnectionHandler[] = [];
  private disconnectHandlers: ConnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];

  private options: EventStreamOptions = {
    eventTypes: ['*'],
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 3000,
  };

  private reconnectAttempts = 0;
  private isConnected = false;
  private isManualDisconnect = false;

  constructor(config: HermesSDKConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.agentId = config.agentId;
    this.logger = config.logger || console;
  }

  /**
   * Connect to the TARA event stream.
   */
  async connect(options?: EventStreamOptions): Promise<void> {
    if (options) this.options = { ...this.options, ...options };
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.baseUrl}/event-stream`;

      this.socket = io(wsUrl, {
        transports: ['websocket'],
        query: {
          consumerName: this.agentId || 'hermes-agent',
          apiKey: this.apiKey,
        },
        reconnection: false, // We handle reconnection ourselves
      });

      this.socket.on('connected', (data: any) => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.info(`[HermesSDK] Connected to event stream: ${data.subscriptionId}`);

        // Subscribe to configured event types
        this.socket!.emit('subscribe', { eventTypes: this.options.eventTypes });

        this.connectHandlers.forEach((h) => h());
        resolve();
      });

      this.socket.on('subscribed', (data: any) => {
        this.logger.info(`[HermesSDK] Subscribed to events: ${JSON.stringify(data.eventTypes)}`);
      });

      this.socket.on('event', (event: TaraEvent) => {
        this.eventHandlers.forEach((handler) => {
          try {
            handler(event);
          } catch (err: any) {
            this.logger.error(`[HermesSDK] Event handler error: ${err.message}`);
          }
        });
      });

      this.socket.on('disconnect', (reason: string) => {
        this.isConnected = false;
        this.logger.warn(`[HermesSDK] Disconnected: ${reason}`);
        this.disconnectHandlers.forEach((h) => h());

        if (!this.isManualDisconnect && this.options.autoReconnect) {
          this.attemptReconnect();
        }
      });

      this.socket.on('connect_error', (error: Error) => {
        this.logger.error(`[HermesSDK] Connection error: ${error.message}`);
        this.errorHandlers.forEach((h) => h(error));

        if (!this.isConnected) {
          // First connection failed
          if (this.options.autoReconnect) {
            this.attemptReconnect();
          } else {
            reject(error);
          }
        }
      });

      this.socket.on('error', (data: any) => {
        this.logger.error(`[HermesSDK] Server error: ${JSON.stringify(data)}`);
        this.errorHandlers.forEach((h) => h(new Error(data.message || 'Unknown error')));
      });
    });
  }

  /**
   * Disconnect from the event stream.
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    if (this.socket) {
      this.socket.emit('unsubscribe');
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.logger.info('[HermesSDK] Disconnected from event stream');
  }

  /**
   * Update event type subscriptions without reconnecting.
   */
  subscribe(eventTypes: string[]): void {
    this.options.eventTypes = eventTypes;
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe', { eventTypes });
    }
  }

  /**
   * Register an event handler.
   */
  on(event: 'event', handler: EventHandler): this;
  on(event: 'connected', handler: ConnectionHandler): this;
  on(event: 'disconnected', handler: ConnectionHandler): this;
  on(event: 'error', handler: ErrorHandler): this;
  on(event: string, handler: any): this {
    switch (event) {
      case 'event':
        this.eventHandlers.push(handler);
        break;
      case 'connected':
        this.connectHandlers.push(handler);
        break;
      case 'disconnected':
        this.disconnectHandlers.push(handler);
        break;
      case 'error':
        this.errorHandlers.push(handler);
        break;
    }
    return this;
  }

  /**
   * Check if currently connected.
   */
  get connected(): boolean {
    return this.isConnected;
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private async attemptReconnect(): Promise<void> {
    const max = this.options.maxReconnectAttempts || 10;
    const delay = this.options.reconnectDelay || 3000;

    if (this.reconnectAttempts >= max) {
      this.logger.error(`[HermesSDK] Max reconnection attempts (${max}) reached. Giving up.`);
      this.errorHandlers.forEach((h) => h(new Error('Max reconnection attempts reached')));
      return;
    }

    this.reconnectAttempts++;
    const backoff = delay * Math.pow(1.5, this.reconnectAttempts - 1);

    this.logger.info(`[HermesSDK] Reconnecting in ${Math.round(backoff)}ms (attempt ${this.reconnectAttempts}/${max})`);

    await new Promise((r) => setTimeout(r, backoff));

    if (this.isManualDisconnect) return; // User disconnected during backoff

    try {
      await this.connect(this.options);
    } catch {
      // attemptReconnect will be called again from disconnect handler
    }
  }
}
