import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { MultiTenancyUtil } from "../../shared/utils/multi-tenancy.util";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class OmnichannelService {
  private readonly logger = new Logger(OmnichannelService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a message via the specified channel
   */
  async sendMessage(ctx: TenantContext, contactId: string, channel: string, content: string) {
    this.logger.log(`Sending ${channel} message to contact ${contactId}`);

    // 1. Persist message in database
    const message = await this.prisma.marketing_omnichannel_messages.create({
      data: {
        id: uuidv4(),
        tenant_id: ctx.tenant_id,
        contact_id: contactId,
        channel,
        direction: "OUTBOUND",
        content,
        status: "PENDING",
      }
    });

    // 2. Execute provider logic (Commented out for plug-and-play as per feedback)
    try {
      /*
      if (channel === "SMS") {
        // Example Twilio integration
        // await this.twilioClient.messages.create({ body: content, to: contact.phone, from: '...' });
      } else if (channel === "WHATSAPP") {
        // Example Meta Business API integration
        // await this.metaApi.sendWhatsAppMessage(contact.phone, content);
      } else if (channel === "EMAIL") {
        // Example SendGrid/SES integration
        // await this.emailProvider.send({ to: contact.email, subject: '...', text: content });
      }
      */

      // Simulate successful send
      await this.prisma.marketing_omnichannel_messages.update({
        where: { id: message.id },
        data: { status: "SENT", sent_at: new Date() }
      });

      return { success: true, messageId: message.id };
    } catch (error) {
      this.logger.error(`Failed to send ${channel} message: ${error.message}`);
      await this.prisma.marketing_omnichannel_messages.update({
        where: { id: message.id },
        data: { status: "FAILED", metadata: { error: error.message } }
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Under Construction Placeholder for UI
   */
  getChannelStatus() {
    return {
      WHATSAPP: { status: "UNDER_CONSTRUCTION", message: "WhatsApp Business API integration coming soon." },
      SMS: { status: "READY_FOR_PLUG_AND_PLAY", message: "Configure your provider credentials in settings." },
      EMAIL: { status: "ACTIVE", message: "Email delivery system active." }
    };
  }

  /**
   * Get all conversations for the tenant
   */
  async getConversations(ctx: TenantContext) {
    const messages = await this.prisma.marketing_omnichannel_messages.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      include: {
        contact: true
      },
      orderBy: { sent_at: "desc" }
    });

    // Group by contact_id to form conversations
    const groups = new Map<string, any>();
    for (const msg of messages) {
      if (!groups.has(msg.contact_id)) {
        groups.set(msg.contact_id, {
          id: msg.id,
          contactId: msg.contact_id,
          contactName: `${msg.contact?.first_name || ""} ${msg.contact?.last_name || ""}`.trim() || "Unknown Contact",
          contactEmail: msg.contact?.email,
          lastMessage: msg.content,
          lastTimestamp: msg.sent_at,
          unreadCount: msg.direction === "INBOUND" && msg.status !== "READ" ? 1 : 0,
          channel: msg.channel,
          score: msg.contact?.score || 0,
        });
      } else if (msg.direction === "INBOUND" && msg.status !== "READ") {
        groups.get(msg.contact_id).unreadCount++;
      }
    }

    return Array.from(groups.values());
  }
}
