import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { MultiTenancyUtil } from "../../shared/utils/multi-tenancy.util";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class Customer360Service {
  private readonly logger = new Logger(Customer360Service.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get unified customer profile with full interaction timeline
   */
  async getUnifiedProfile(ctx: TenantContext, contactId: string) {
    const contact = await this.prisma.marketing_contacts.findFirst({
      where: { id: contactId, ...MultiTenancyUtil.getScope(ctx) },
      include: {
        messages: { orderBy: { sent_at: "desc" }, take: 20 },
        appointments: { orderBy: { scheduled_at: "desc" }, take: 10 },
        marketing_leads: true,
        retail_customers: true,
        sales_leads: true,
      },
    });

    if (!contact) return null;

    // Build timeline
    const timeline = this.buildTimeline(contact);

    return {
      ...contact,
      timeline,
    };
  }

  private buildTimeline(contact: any) {
    const events: any[] = [];

    // Add messages
    (contact.messages || []).forEach((m: any) => {
      events.push({
        id: m.id,
        type: "MESSAGE",
        channel: m.channel,
        direction: m.direction,
        content: m.content,
        timestamp: m.sent_at,
        status: m.status,
      });
    });

    // Add appointments
    (contact.appointments || []).forEach((a: any) => {
      events.push({
        id: a.id,
        type: "APPOINTMENT",
        timestamp: a.scheduled_at,
        status: a.status,
        notes: a.notes,
      });
    });

    // Add lead creations
    (contact.marketing_leads || []).forEach((l: any) => {
      events.push({
        id: l.id,
        type: "LEAD_CAPTURE",
        source: l.source,
        timestamp: l.created_at,
        detail: `Captured from ${l.source}`,
      });
    });

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Sync/Create a marketing contact from a lead or customer
   */
  async syncContactFromEntity(ctx: TenantContext, type: "LEAD" | "RETAIL", entityId: string) {
    let email: string | null = null;
    let phone: string | null = null;
    let first_name = "Unknown";
    let last_name = "User";

    if (type === "LEAD") {
      const lead = await this.prisma.marketing_leads.findUnique({ where: { id: entityId } });
      if (!lead) return;
      email = lead.email;
      phone = lead.phone;
      const names = (lead.contact_name || "Unknown User").split(" ");
      first_name = names[0];
      last_name = names.slice(1).join(" ") || "User";
    } else {
      const customer = await this.prisma.retail_customers.findUnique({ where: { id: entityId } });
      if (!customer) return;
      email = customer.email;
      phone = customer.phone;
      const names = (customer.name || "Unknown User").split(" ");
      first_name = names[0];
      last_name = names.slice(1).join(" ") || "User";
    }

    // Upsert contact
    const scope = MultiTenancyUtil.getScope(ctx);
    
    // Find existing by email or phone within tenant
    const existing = await this.prisma.marketing_contacts.findFirst({
      where: {
        tenant_id: ctx.tenant_id,
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ].filter(Boolean) as any
      }
    });

    if (existing) {
      // Update link
      if (type === "LEAD") {
        await this.prisma.marketing_leads.update({
          where: { id: entityId },
          data: { contact_id: existing.id }
        });
      } else {
        await this.prisma.retail_customers.update({
          where: { id: entityId },
          data: { contact_id: existing.id }
        });
      }
      return existing;
    }

    // Create new contact
    const contact = await this.prisma.marketing_contacts.create({
      data: {
        id: uuidv4(),
        tenant_id: ctx.tenant_id,
        first_name,
        last_name,
        email,
        phone,
        status: "ACTIVE",
      }
    });

    // Update link
    if (type === "LEAD") {
      await this.prisma.marketing_leads.update({
        where: { id: entityId },
        data: { contact_id: contact.id }
      });
    } else {
      await this.prisma.retail_customers.update({
        where: { id: entityId },
        data: { contact_id: contact.id }
      });
    }

    return contact;
  }
}
