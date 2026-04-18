import { Prisma } from '@prisma/client';

export interface ResourceReservation {
  id: string;
  tenant_id: string;
  resourceId: string; // Room, Equipment, or Staff
  patientId: string;
  start_time: Date;
  end_time: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  fee: Prisma.Decimal;
  currency: string;
}

export abstract class ClinicRepository {
  abstract getReservations(tenant_id: string): Promise<ResourceReservation[]>;
  abstract getReservationById(tenant_id: string, reservationId: string): Promise<ResourceReservation | null>;
  abstract createReservation(tenant_id: string, data: any): Promise<ResourceReservation>;
  
  /**
   * Enterprise Hook: Resource-to-Finance Billing
   * Automatically generates a Ledger entry when a "Room Reservation" is completed.
   */
  abstract postReservationToLedger(tenant_id: string, reservationId: string): Promise<void>;
}
