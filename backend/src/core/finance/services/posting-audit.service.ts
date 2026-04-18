import { Injectable, Logger } from '@nestjs/common';
import { PostingState, StateTransition } from '../domain/posting-gateway.interfaces';

@Injectable()
export class PostingAuditService {
  private readonly logger = new Logger(PostingAuditService.name);

  /**
   * Records a state transition for a posting request.
   */
  async recordTransition(request_id: string, from: PostingState, to: PostingState, reason?: string): Promise<StateTransition> {
    const transition: StateTransition = {
      from,
      to,
      timestamp: new Date(),
      reason,
    };

    this.logger.log(`[Audit] Request ${request_id}: ${from} -> ${to} ${reason ? `(${reason})` : ''}`);
    
    // In production, this would persist to a specialized Audit table
    return transition;
  }

  /**
   * Captures operational metrics for Prometheus/Grafana.
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>) {
    // Simulated metric capture
    this.logger.debug(`[Metric] ${name}: ${value} ${labels ? JSON.stringify(labels) : ''}`);
  }

  /**
   * General ledger event logging (Phase 11 Standard).
   */
  async log(params: {
    tenant_id: string;
    company_id: string;
    module: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: any;
  }) {
    this.logger.log(`[AuditLog] ${params.action} on ${params.entity_type}:${params.entity_id} (Company: ${params.company_id})`);
  }
}
