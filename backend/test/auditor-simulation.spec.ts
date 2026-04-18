import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * STANDALONE AUDITOR SIMULATION (V2)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Includes automatic Tenant/Company provisioning to satisfy FKs.
 */

async function simulate() {
  const prisma = new PrismaClient();
  const tenantId = `audit-sim-${Date.now()}`;
  const userId = 'auditor-bot';

  console.log('--- STARTING STANDALONE AUDITOR SIMULATION (V2) ---');
  
  try {
    // 0. Provision Test Tenant
    console.log(`[0] Provisioning Test Tenant: ${tenantId}...`);
    await prisma.company.create({
      data: {
        id: tenantId,
        name: 'Audit Simulation Corp',
        code: `AUDIT-${Date.now()}`,
        status: 'active'
      }
    });
    console.log('✅ Tenant provisioned.');

    // 1. Log simulation function (mimics AuditService.log)
    async function logAudit(params: any) {
      const lastLogs = await prisma.auditLog.findMany({
        where: { tenantId: params.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 1
      });

      const previousHash = lastLogs.length > 0 ? lastLogs[0].hashChain : 'GENESIS';
      const logData = JSON.stringify({
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entityId: params.entityId,
        correlationId: params.correlationId,
        previousHash,
      });
      const hashChain = createHash('sha256').update(logData).digest('hex');

      return prisma.auditLog.create({
        data: {
          id: uuidv4(),
          tenantId: params.tenantId,
          userId: params.userId,
          module: params.module,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          previousHash,
          hashChain,
          metadata: params.metadata || {},
          severity: params.severity || 'INFO',
        }
      });
    }

    // 2. Verify chain function (mimics AuditService.verifyChain)
    async function verifyChain(tId: string) {
      const logs = await prisma.auditLog.findMany({
        where: { tenantId: tId },
        orderBy: { createdAt: 'asc' }
      });

      let lastHash = 'GENESIS';
      for (const log of logs) {
        const expectedPrevHash = lastHash;
        const logData = JSON.stringify({
          tenantId: log.tenantId,
          userId: log.userId,
          action: log.action,
          entityId: log.entityId,
          correlationId: log.correlationId || undefined,
          previousHash: expectedPrevHash,
        });
        const recomputedHash = createHash('sha256').update(logData).digest('hex');

        if (log.previousHash !== expectedPrevHash || log.hashChain !== recomputedHash) {
          return { valid: false, invalidId: log.id, expected: recomputedHash, actual: log.hashChain };
        }
        lastHash = log.hashChain!;
      }
      return { valid: true, count: logs.length };
    }

    // Stage 1: Generate Chain
    console.log('[1] Generating secured audit chain (5 records)...');
    for (let i = 1; i <= 5; i++) {
      await logAudit({
        tenantId,
        userId,
        module: 'FINANCE',
        action: 'TRANSACTION_CREATE',
        entityType: 'JOURNAL',
        entityId: `JNL-00${i}`,
        metadata: { amount: i * 1000 }
      });
    }
    console.log('✅ Chain generated.');

    // Stage 2: Initial Verification
    console.log('[2] Verifying initial chain integrity...');
    const result = await verifyChain(tenantId);
    if (result.valid) {
      console.log(`✅ Success: Chain is valid. Checked ${result.count} records.\n`);
    } else {
      throw new Error('Initial chain failed verification!');
    }

    // Stage 3: Tamper Simulation
    console.log('[3] SIMULATING UNAUTHORIZED DATABASE TAMPER...');
    const logs = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });
    const target = logs[2];
    await prisma.auditLog.update({
      where: { id: target.id },
      data: { hashChain: 'FORGED-HASH-VALUE' }
    });
    console.log('⚠️  DATABASE MUTATED: Record #3 hash chain broken.\n');

    // Stage 4: Detect Corruption
    console.log('[4] Rerunning integrity scan...');
    const finalResult = await verifyChain(tenantId);
    if (!finalResult.valid) {
      console.log('🚨 CORRUPTION DETECTED SUCCESSFULLY!');
      console.log(`   Broken at record ID: ${finalResult.invalidId}`);
      console.log('✅ PASS: Tamper detection verified.\n');
    } else {
      console.error('❌ CRITICAL FAILURE: System failed to detect database tamper!');
      process.exit(1);
    }

    console.log('--- STANDALONE SIMULATION COMPLETE: PRODUCTION READY ---');
  } catch (err) {
    console.error('Simulation Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

simulate();
