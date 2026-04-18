import { Injectable, Inject } from '@nestjs/common';
import { ILedgerProjectionCheckpointRepository } from '../repositories/interfaces/ledger-projection-checkpoint.repository.interface';

@Injectable()
export class ProjectionCheckpointService {
  constructor(
    @Inject('ILedgerProjectionCheckpointRepository')
    private readonly checkpointRepo: ILedgerProjectionCheckpointRepository,
  ) {}

  /**
   * Returns the latest ledgerSequence that has been fully processed by all projections.
   */
  async getLatestCheckpoint(tenant_id: string, company_id: string): Promise<number> {
    return this.checkpointRepo.getCheckpoint(tenant_id, company_id, 'ALL_PROJECTIONS');
  }
}
