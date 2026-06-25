import { HermesSDKConfig, HermesLogger } from './types';

/**
 * Lightweight HTTP client for Hermes SDK.
 * Zero external dependencies — uses native fetch (Node 18+).
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly agentId?: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly backoffMs: number;
  private readonly logger: HermesLogger;

  constructor(config: HermesSDKConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.agentId = config.agentId;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.retry?.maxRetries ?? 3;
    this.backoffMs = config.retry?.backoffMs ?? 1000;
    this.logger = config.logger || console;
  }

  async get<T = any>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>('GET', url);
  }

  async post<T = any>(path: string, body: any): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>('POST', url, body);
  }

  async put<T = any>(path: string, body: any): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>('PUT', url, body);
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }
    return url.toString();
  }

  private async request<T>(method: string, url: string, body?: any): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Hermes-Api-Key': this.apiKey,
        };
        if (this.agentId) {
          headers['X-Hermes-Agent-Id'] = this.agentId;
        }

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          let parsed: any;
          try { parsed = JSON.parse(errorBody); } catch { parsed = { message: errorBody }; }

          // Don't retry 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            throw new HermesApiError(
              parsed.message || `HTTP ${response.status}`,
              response.status,
              parsed,
            );
          }

          // Retry 5xx errors
          throw new Error(`HTTP ${response.status}: ${parsed.message || errorBody}`);
        }

        return await response.json() as T;
      } catch (error: any) {
        if (error instanceof HermesApiError) {
          throw error; // Don't retry client errors
        }

        lastError = error;

        if (attempt < this.maxRetries) {
          const delay = this.backoffMs * Math.pow(2, attempt);
          this.logger.warn(
            `[HermesSDK] Request failed (attempt ${attempt + 1}/${this.maxRetries + 1}), retrying in ${delay}ms: ${error.message}`,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Error class for Hermes API responses.
 */
export class HermesApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response: any,
  ) {
    super(message);
    this.name = 'HermesApiError';
  }
}
