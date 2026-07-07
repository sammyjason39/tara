import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import type { TaraEvent } from '../hr/services/event-bus.service';

export interface WorkflowEmployeeSnapshot {
  id: string;
  employee_code: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  role_id: string | null;
  department: string | null;
  department_id: string | null;
  office: string | null;
  office_location_id: string | null;
  supervisor_id: string | null;
  supervisor_name: string | null;
  employment_status: string;
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  hire_date: string | null;
}

@Injectable()
export class WorkflowContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build a rich evaluation context: payload + resolved employee, actor, supervisor.
   */
  async enrich(event: TaraEvent, variables: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    const subjectId = this.resolveSubjectEmployeeId(event);
    const actorEmployeeId =
      event.actor?.type === 'employee' ? event.actor.id : null;

    const [employee, actorEmployee] = await Promise.all([
      subjectId ? this.loadEmployeeSnapshot(subjectId) : null,
      actorEmployeeId && actorEmployeeId !== subjectId
        ? this.loadEmployeeSnapshot(actorEmployeeId)
        : actorEmployeeId === subjectId
          ? null
          : null,
    ]);

    const resolvedActorEmployee =
      actorEmployee ??
      (actorEmployeeId && actorEmployeeId === subjectId ? employee : null);

    let supervisor: WorkflowEmployeeSnapshot | null = null;
    const supervisorId = employee?.supervisor_id;
    if (supervisorId) {
      supervisor = await this.loadEmployeeSnapshot(supervisorId);
    }

    return {
      event: {
        event_id: event.event_id,
        event_type: event.event_type,
        event_version: event.event_version,
        event_timestamp: event.event_timestamp,
      },
      payload,
      actor: event.actor,
      entity: event.entity,
      metadata: event.metadata ?? {},
      employee,
      actor_employee: resolvedActorEmployee,
      supervisor,
      variables,
    };
  }

  private resolveSubjectEmployeeId(event: TaraEvent): string | null {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    if (payload.employee_id && typeof payload.employee_id === 'string') {
      return payload.employee_id;
    }
    const nested = payload.employee as { id?: string } | undefined;
    if (nested?.id) return nested.id;
    if (event.entity?.type === 'employee') return event.entity.id;
    if (event.actor?.type === 'employee') return event.actor.id;
    return null;
  }

  private async loadEmployeeSnapshot(id: string): Promise<WorkflowEmployeeSnapshot | null> {
    const row = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        role: { select: { id: true, role_name: true } },
        department: { select: { id: true, name: true } },
        office: { select: { id: true, location_name: true } },
        supervisor: { select: { id: true, full_name: true } },
      },
    });
    if (!row || row.employment_status === 'deleted') return null;

    return {
      id: row.id,
      employee_code: row.employee_code,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      role: row.role?.role_name ?? 'Employee',
      role_id: row.role_id,
      department: row.department?.name ?? null,
      department_id: row.department_id,
      office: row.office?.location_name ?? null,
      office_location_id: row.office_location_id,
      supervisor_id: row.supervisor_id,
      supervisor_name: row.supervisor?.full_name ?? null,
      employment_status: row.employment_status,
      whatsapp_number: row.whatsapp_number,
      whatsapp_verified: row.whatsapp_verified ?? false,
      hire_date: row.hire_date ? row.hire_date.toISOString().slice(0, 10) : null,
    };
  }
}
