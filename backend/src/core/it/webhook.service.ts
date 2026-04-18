import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dispatches a webhook request asynchronously with retry logic
   * @param url The destination URL
   * @param payload The data to send
   * @param tenant_id For context
   */
  async dispatch(url: string, payload: any, tenant_id: string): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;

    const execute = async () => {
      attempt++;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-ID": tenant_id,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        this.logger.log(`Webhook dispatched successfully to ${url} on attempt ${attempt}`);
        
        await this.prisma.system_logs.create({
          data: {
          updated_at: new Date(),
        id: uuidv4(),
            tenant_id: tenant_id,
            module: "IT",
            level: "INFO",
            event: "webhook.success",
            message: `Successfully dispatched to ${url}`,
            payload: payload ? (payload as any) : undefined,
          },
        });
      } catch (error) {
        this.logger.error(`Webhook attempt ${attempt} failed for ${url}: ${error.message}`);
        
        await this.prisma.system_logs.create({
          data: {
          updated_at: new Date(),
        id: uuidv4(),
            tenant_id: tenant_id,
            module: "IT",
            level: "ERROR",
            event: "webhook.failure",
            message: `Attempt ${attempt} failed for ${url}: ${error.message}`,
            payload: payload ? (payload as any) : undefined,
          },
        });

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(`Retrying in ${delay}ms...`);
          setTimeout(() => execute(), delay);
        } else {
          this.logger.error(`Webhook to ${url} failed after ${maxRetries} attempts.`);
        }
      }
    };

    // Execute asynchronously
    execute();
  }
}
