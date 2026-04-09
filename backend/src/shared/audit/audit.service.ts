import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface AuditLogParams {
  tenantId: string;
  userId: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  changes?: any;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
  idempotencyKey?: string;
  correlationId?: string;
  eventReferenceId?: string;
}

export interface AuditQueryDto {
  module?: string;
  action?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService implements OnModuleDestroy {
  private verificationInterval: any;
  private readonly metrics = {
    auditWriteLatency: [] as number[],
    auditFailureRate: 0,
    chainVerificationFailures: 0,
    anchorWriteFailures: 0,
  };
  private readonly anchorLogPath = path.join(process.cwd(), 'external_audit_anchors.log');
  private readonly secondaryAnchorPath = path.join(process.cwd(), 'backups', 'audit_anchors.log');

  constructor(private readonly prisma: PrismaService) {
    this.ensureBackupDir();
    this.startSelfVerificationJob();
  }

  onModuleDestroy() {
    if (this.verificationInterval) {
      clearInterval(this.verificationInterval);
    }
  }

  private ensureBackupDir() {
    const dir = path.dirname(this.secondaryAnchorPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private startSelfVerificationJob() {
    // Run every 10 minutes
    this.verificationInterval = setInterval(async () => {
      console.log('[AuditService] Starting continuous self-verification...');
      try {
        const tenants = await this.prisma.auditLog.findMany({
          distinct: ['tenantId'],
          select: { tenantId: true },
        });

        for (const { tenantId } of tenants) {
          // Verify last 200 records
          const result = await this.verifyChain(tenantId); 
          if (!result.valid) {
            console.error(`[AUDIT_ELITE_CRITICAL] Chain corruption detected for tenant ${tenantId}!`, result);
            this.metrics.chainVerificationFailures++;
            // In a real system, trigger NotificationService here
          }
        }
      } catch (err) {
        console.error('[AuditService] Self-verification job failed:', err);
      }
    }, 600000); // 10 minutes
  }

  async log(params: AuditLogParams, injectedTx?: any) {
    const startTime = Date.now();
    const execute = async (tx: any) => {
      // 1. Fix 1: Transaction Isolation & Fix 2: Explicit Locking
      // Fetch last hash with FOR UPDATE to prevent race conditions in chain
      const lastLogs: any[] = await tx.$queryRaw`
        SELECT hashChain FROM audit_logs 
        WHERE tenant_id = ${params.tenantId} 
        ORDER BY created_at DESC 
        LIMIT 1 
        FOR UPDATE
      `;

      const previousHash = lastLogs.length > 0 ? lastLogs[0].hashChain : 'GENESIS';

      // 2. Compute current hash
      const logData = JSON.stringify({
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entityId: params.entityId,
        correlationId: params.correlationId,
        previousHash,
      });
      const currentHash = createHash('sha256').update(logData).digest('hex');

      const result = await tx.auditLog.create({
        data: {
          id: uuidv4(),
          tenantId: params.tenantId,
          userId: params.userId,
          module: params.module,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: params.metadata ?? {},
          changes: params.changes ?? {},
          beforeState: params.beforeState ?? undefined,
          afterState: params.afterState ?? undefined,
          sourceModule: params.module,
          ipAddress: params.ipAddress ?? undefined,
          userAgent: params.userAgent ?? undefined,
          severity: params.severity ?? 'INFO',
          idempotencyKey: params.idempotencyKey ?? undefined,
          correlationId: params.correlationId ?? undefined,
          eventReferenceId: params.eventReferenceId ?? undefined,
          hashChain: currentHash,
          previousHash,
        },
      });

      // 3. Fix 5: Audit Anchoring (Every 100 records)
      const count = await tx.auditLog.count({ where: { tenantId: params.tenantId } });
      if (count % 100 === 0) {
        const anchor = await tx.auditHashAnchor.create({
          data: {
            id: uuidv4(),
            tenantId: params.tenantId,
            anchorHash: currentHash,
            recordCount: count,
          },
        });
        
        // Step 2: External Anchor Publishing
        this.publishAnchorExternal(anchor);
        console.log(`[AuditService] Anchor recorded for tenant ${params.tenantId} at record ${count}`);
      }

      // 4. Severity Model Escalation
      if (params.severity === 'CRITICAL') {
        console.error(`[AUDIT_CRITICAL] ${params.action} on ${params.entityType}:${params.entityId} by user ${params.userId}`);
      }

      // Track Latency
      this.metrics.auditWriteLatency.push(Date.now() - startTime);
      if (this.metrics.auditWriteLatency.length > 1000) this.metrics.auditWriteLatency.shift();

      return result;
    };

    try {
      if (injectedTx) {
        return await execute(injectedTx);
      }

      return await this.prisma.$transaction(async (tx: any) => {
        return await execute(tx);
      }, {
        isolationLevel: 'Serializable', // Fix 1: Isolation Guarantee
      });
    } catch (error: any) {
      this.metrics.auditFailureRate++;
      if (error.code === 'P2002') {
        console.warn(`[AuditService] Duplicate idempotencyKey detected for ${params.idempotencyKey}. Skipping.`);
        return null; 
      }

      console.error('[AuditService] Failed to create audit log:', error);
      return null;
    }
  }

  async query(tenantId: string, filters: AuditQueryDto) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters.module) where.module = filters.module;
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.severity) where.severity = filters.severity;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Step 1: Audit Chain Verification API (Read-only)
   */
  async verifyChain(tenantId: string, fromTimestamp?: Date) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        createdAt: fromTimestamp ? { gte: fromTimestamp } : undefined,
      },
      orderBy: { createdAt: 'asc' },
    });

    let lastHash = 'GENESIS';
    if (fromTimestamp) {
      const prevLog = await this.prisma.auditLog.findFirst({
        where: { tenantId, createdAt: { lt: fromTimestamp } },
        orderBy: { createdAt: 'desc' },
        select: { hashChain: true },
      });
      lastHash = prevLog?.hashChain || 'GENESIS';
    }

    let checkedRecords = 0;
    for (const log of logs) {
      checkedRecords++;
      const expectedPrevHash = lastHash;
      
      const logData = JSON.stringify({
        tenantId: log.tenantId,
        userId: log.userId,
        action: log.action,
        entityId: log.entityId,
        correlationId: log.correlationId,
        previousHash: expectedPrevHash,
      });
      const recomputedHash = createHash('sha256').update(logData).digest('hex');

      if (log.previousHash !== expectedPrevHash || log.hashChain !== recomputedHash) {
        this.metrics.chainVerificationFailures++;
        return {
          valid: false,
          checkedRecords,
          firstInvalidRecord: {
            id: log.id,
            action: log.action,
            expectedPrevHash,
            actualPrevHash: log.previousHash,
          },
          lastValidHash: expectedPrevHash,
        };
      }
      lastHash = log.hashChain!;
    }

    return {
      valid: true,
      checkedRecords,
      lastValidHash: lastHash,
    };
  }

  /**
   * Step 2: External Anchor Publishing (Multi-Region Replication)
   */
  private publishAnchorExternal(anchor: any) {
    const entry = `${anchor.anchoredAt.toISOString()} | ${anchor.tenantId} | ${anchor.anchorHash}\n`;
    
    // Primary local log
    try {
      fs.appendFileSync(this.anchorLogPath, entry);
    } catch (err) {
      console.error('[AuditService] Failed to publish anchor to primary storage:', err);
      this.metrics.anchorWriteFailures++;
    }

    // Secondary backup log (Simulated Replication)
    try {
      fs.appendFileSync(this.secondaryAnchorPath, entry);
    } catch (err) {
      console.error('[AuditService] Failed to replicate anchor to secondary storage:', err);
      this.metrics.anchorWriteFailures++;
    }
  }

  /**
   * Step 2: Public Anchor Publishing (Public Trust Layer)
   */
  async getPublicAnchors(limit: number = 20) {
    return this.prisma.auditHashAnchor.findMany({
      orderBy: { anchoredAt: 'desc' },
      take: limit,
      select: {
        tenantId: true,
        anchorHash: true,
        anchoredAt: true,
        recordCount: true,
      },
    });
  }

  /**
   * Step 6: Lightweight Audit Write Metrics (p95)
   */
  getMetrics() {
    const latencies = [...this.metrics.auditWriteLatency].sort((a, b) => a - b);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    
    // p95 calculation
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies.length > 0 ? latencies[p95Index] : 0;

    return {
      ...this.metrics,
      avgWriteLatencyMs: avgLatency,
      p95WriteLatencyMs: p95Latency,
      timestamp: new Date().toISOString(),
    };
  }

  incrementRepairCount() {
    // Increment repair count in metrics
    (this.metrics as any).repairInvocationCount = ((this.metrics as any).repairInvocationCount || 0) + 1;
  }
}
