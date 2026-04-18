import { Injectable, Logger } from '@nestjs/common';
import { ClinicRepository, ResourceReservation } from './repositories/clinic.repository';

@Injectable()
export class ClinicService {
  private readonly logger = new Logger(ClinicService.name);

  constructor(private readonly repository: ClinicRepository) {}

  async createReservation(tenant_id: string, data: any): Promise<ResourceReservation> {
    this.logger.log(`Creating clinic reservation for patient ${data.patientId}`);
    const reservation = await this.repository.createReservation(tenant_id, data);
    
    // Enterprise Hook: Post to Ledger
    await this.repository.postReservationToLedger(tenant_id, reservation.id);
    
    return reservation;
  }

  async getReservation(tenant_id: string, id: string): Promise<ResourceReservation | null> {
    return this.repository.getReservationById(tenant_id, id);
  }
}
