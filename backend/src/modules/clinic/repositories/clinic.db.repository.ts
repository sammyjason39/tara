import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { ClinicRepository, ResourceReservation } from './clinic.repository';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClinicDbRepository implements ClinicRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getReservations(tenant_id: string): Promise<ResourceReservation[]> {
    const raw = await (this.prisma as any).clinicReservation.findMany({
      where: { tenant_id },
      orderBy: { start_time: 'desc' },
    });
    return raw.map((r: any) => this.mapReservation(r));
  }

  async getReservationById(tenant_id: string, reservationId: string): Promise<ResourceReservation | null> {
    const raw = await (this.prisma as any).clinicReservation.findUnique({
      where: { id: reservationId, tenant_id },
    });
    return raw ? this.mapReservation(raw) : null;
  }

  async createReservation(tenant_id: string, data: any): Promise<ResourceReservation> {
    const created = await (this.prisma as any).clinicReservation.create({
      data: {
        id: uuidv4(),
        tenant_id,
        resourceId: data.resourceId,
        patientId: data.patientId,
        start_time: new Date(data.start_time),
        end_time: new Date(data.end_time),
        status: data.status || 'scheduled',
        fee: data.fee,
        currency: data.currency || 'USD',
      },
    });
    return this.mapReservation(created);
  }

  /**
   * Enterprise Hook: Resource-to-Finance Billing
   * Automatically generates a Ledger entry when a "Room Reservation" is completed.
   * Demonstrates inter-module financial integration.
   */
  async postReservationToLedger(tenant_id: string, reservationId: string): Promise<void> {
    const reservation = await (this.prisma as any).clinicReservation.findUnique({
      where: { id: reservationId, tenant_id },
    });

    if (!reservation || reservation.status !== 'completed') return;

    await this.prisma.$transaction(async (tx) => {
      // 1. Create Finance Journal Entry from Clinic Module
      const journal = await (tx as any).finance_journal_entries.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          fiscal_period_id: 'auto-period-2026', // Placeholder for skeleton
          ref: `CLINIC-${reservation.id}`,
          description: `Clinic Billing: Reservation ${reservation.id}`,
          postingDate: new Date(),
          effectiveDate: new Date(),
          status: 'DRAFT',
          updated_at: new Date(),
        },
      });

      // 2. Log linkage in Audit Trail
      await (tx as any).audit_logs.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          module: 'CLINIC',
          action: 'FINANCE_HANDOFF',
          entity_type: 'JOURNAL_ENTRY',
          entity_id: journal.id,
          user_id: 'CLINIC_BILLING_SYSTEM',
          metadata: { reservationId, fee: reservation.fee },
          hash_chain: 'LINKED_TO_FINANCE', 
          previous_hash: 'ANCHORED',
        },
      });
    });
  }

  private mapReservation(r: any): ResourceReservation {
    return {
      id: r.id,
      tenant_id: r.tenant_id,
      resourceId: r.resourceId,
      patientId: r.patientId,
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.status,
      fee: r.fee,
      currency: r.currency,
    };
  }
}
