import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../persistence/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class MonitoringJobService {
  private readonly logger = new Logger(MonitoringJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditChain: AuditChainService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Periodic Audit Integrity Check
   * Runs every 30 minutes to verify the blockchain audit log for all active tenants.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async verifyAllAuditChains() {
    this.logger.log('Starting scheduled audit integrity verification for all tenants...');
    
    try {
      const companies = await this.prisma.companies.findMany({
        select: { id: true, name: true }
      });

      for (const company of companies) {
        const result = await this.auditChain.verifyIntegrity(company.id);
        
        if (result.status === 'CORRUPT') {
          this.logger.error(`[Integrity Alert] Audit chain corruption detected for tenant ${company.name} (${company.id})! Broken links: ${result.brokenCount}`);
          
          // Log a critical system audit event
          await this.auditService.log({
            tenant_id: company.id,
            user_id: 'SYSTEM_MONITOR',
            module: 'SYSTEM_INTEGRITY',
            action: 'AUDIT_CORRUPTION_DETECTED',
            entity_type: 'AUDIT_CHAIN',
            entity_id: company.id,
            severity: 'CRITICAL',
            metadata: {
              brokenCount: result.brokenCount,
              firstBrokenId: result.firstBrokenId,
              details: result.details,
              verifiedAt: new Date().toISOString()
            }
          });
        }
      }
      
      this.logger.log(`Audit integrity verification completed for ${companies.length} tenants.`);
    } catch (error) {
      this.logger.error('Failed to run scheduled audit integrity verification:', error.stack);
    }
  }

  /**
   * Sync Health Monitor
   * Detects excessive lag in the outbox processing.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorSyncHealth() {
    this.logger.log('Starting scheduled sync health monitor...');
    
    try {
      const threshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes old
      const stuckEvents = await this.prisma.sys_outbox_events.count({
        where: {
          status: 'PENDING',
          created_at: { lt: threshold }
        }
      });

      if (stuckEvents > 10) {
        this.logger.warn(`[Sync Alert] Detected ${stuckEvents} stuck outbox events older than 5 minutes.`);
        // Note: Could trigger a notification/alert here
      }
    } catch (error) {
      this.logger.error('Failed to monitor sync health:', error.stack);
    }
  }
}
