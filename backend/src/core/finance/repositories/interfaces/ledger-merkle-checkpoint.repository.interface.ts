import { LedgerMerkleCheckpoint } from '../../domain/finance.interfaces';

export interface ILedgerMerkleCheckpointRepository {
  /** Persist a newly built Merkle checkpoint. */
  create(tenant_id: string, company_id: string, data: Partial<LedgerMerkleCheckpoint>): Promise<LedgerMerkleCheckpoint>;
  /** Fetch the most recent checkpoint for a tenant. */
  findLatest(tenant_id: string, company_id: string): Promise<LedgerMerkleCheckpoint | null>;
  /** Fetch the checkpoint whose window covers the given ledgerSequence. */
  findForSequence(tenant_id: string, company_id: string, seq: number): Promise<LedgerMerkleCheckpoint | null>;
  /** Fetch all checkpoints for a tenant, ordered by fromSequence ASC. */
  findAll(tenant_id: string, company_id: string): Promise<LedgerMerkleCheckpoint[]>;
}
