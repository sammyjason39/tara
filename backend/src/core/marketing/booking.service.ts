import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { MultiTenancyUtil } from "../../shared/utils/multi-tenancy.util";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAppointment(ctx: TenantContext, data: any) {
    this.logger.log(`Creating appointment for contact ${data.contact_id}`);
    
    return this.prisma.marketing_appointments.create({
      data: {
        id: uuidv4(),
        tenant_id: ctx.tenant_id,
        contact_id: data.contact_id,
        staff_id: data.employee_id || data.staff_id,
        scheduled_at: new Date(data.scheduled_at),
        duration_mins: data.duration_mins || 30,
        status: "SCHEDULED",
        notes: data.notes,
      }
    });
  }

  async getAppointments(ctx: TenantContext) {
    return this.prisma.marketing_appointments.findMany({
      where: { tenant_id: ctx.tenant_id },
      include: {
        contact: true
      },
      orderBy: { scheduled_at: "asc" }
    });
  }

  async cancelAppointment(ctx: TenantContext, id: string) {
    return this.prisma.marketing_appointments.update({
      where: { id, tenant_id: ctx.tenant_id },
      data: { status: "CANCELLED" }
    });
  }
}
