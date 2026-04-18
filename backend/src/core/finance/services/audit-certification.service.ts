import { Injectable, Logger } from '@nestjs/common';
import { InsightService } from './insight.service';
import { ForecastService } from './forecast.service';
import { RecommendationService } from './recommendation.service';
import { ReportingEngineService } from './reporting-engine.service';
import { FinancialCertificationPack, ReportIntegrityHash, IntelligenceIntegrityHash } from '../types/certification.types';
import * as crypto from 'crypto';
import { PrismaService } from '../../../persistence/prisma.service';


@Injectable()
export class AuditCertificationService {
  private readonly logger = new Logger(AuditCertificationService.name);
  


  constructor(
    private readonly prisma: PrismaService,
    private readonly insightService: InsightService,
    private readonly forecastService: ForecastService,
    private readonly recommendationService: RecommendationService,
    private readonly reportingEngineService: ReportingEngineService,
  ) {}


  /**
   * Deterministic SHA-256 Utility
   */
  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Deterministic Object Serialization (Key sorting)
   */
  private stableSerialize(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item: any) => this.stableSerialize(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return (
      '{' +
      keys
        .map((k) => `${JSON.stringify(k)}:${this.stableSerialize(obj[k])}`)
        .join(',') +
      '}'
    );
  }


  /**
   * Seal a fiscal period by generating a root certification pack
   */
  async sealPeriod(params: {
    tenant_id: string;
    company_id: string;
    snapshotId: string; // Sequence mapping or UUID
    fiscalPeriodId: string;
    user_id: string;
    correlation_id: string;
  }): Promise<FinancialCertificationPack> {
    const { tenant_id, company_id, snapshotId, fiscalPeriodId, user_id, correlation_id } = params;

    this.logger.log(`Initiating Period Seal for Snapshot: ${snapshotId}`, correlation_id);

    // STEP 1: Check existing certification by (tenant_id, snapshotId)
    const existing = await this.prisma.finance_certifications.findUnique({
      where: {
        tenant_id_snapshot_id: {
          tenant_id: tenant_id,
          snapshot_id: snapshotId,
        },
      },
    });

    if (existing) {
      this.logger.log(`[DB] HIT FinancialCertification id=${existing.id} for snapshot ${snapshotId}`, correlation_id);
      return existing.payload as unknown as FinancialCertificationPack;
    }


    // 1. Resolve Snapshot Sequence
    const sequence = parseInt(snapshotId, 10) || 0;

    // 2. Aggregate Reporting Layer Hashes
    const [tb, pl, bs] = await Promise.all([
      this.reportingEngineService.getTrialBalance(tenant_id, company_id, fiscalPeriodId),
      this.reportingEngineService.getProfitLoss(tenant_id, company_id, fiscalPeriodId),
      this.reportingEngineService.getBalanceSheet(tenant_id, company_id, new Date()), // Simplified
    ]);

    const reportHashes: ReportIntegrityHash[] = [
      { reportType: 'TRIAL_BALANCE', hash: (tb as any).integrityHash || this.sha256(this.stableSerialize(tb)), generatedAt: new Date() },
      { reportType: 'PROFIT_LOSS', hash: (pl as any).integrityHash || this.sha256(this.stableSerialize(pl)), generatedAt: new Date() },
      { reportType: 'BALANCE_SHEET', hash: (bs as any).integrityHash || this.sha256(this.stableSerialize(bs)), generatedAt: new Date() },
    ];

    // 3. Aggregate Intelligence Layer Hashes
    const [insights, forecast, recommendations] = await Promise.all([
      this.insightService.getInsights({ tenant_id, company_id, snapshotId }),
      this.forecastService.getForecast({ tenant_id, company_id, snapshotId }),
      this.recommendationService.getRecommendations({ tenant_id, company_id, snapshotId }),
    ]);

    const intelligenceHashes: IntelligenceIntegrityHash[] = [
      { category: 'INSIGHTS', hash: this.sha256(this.stableSerialize(insights)), sourceCount: insights.length },
      { category: 'FORECASTS', hash: (forecast as any).forecastHash || this.sha256(this.stableSerialize(forecast)), sourceCount: 1 },
      { category: 'RECOMMENDATIONS', hash: this.sha256(this.stableSerialize(recommendations)), sourceCount: recommendations.length },
    ];

    // 4. Generate Total Root Hash
    const totalRootHash = this.sha256(
      reportHashes.map((r: any) => r.hash).join('') + intelligenceHashes.map((i) => i.hash).join(''),
    );

    const pack: FinancialCertificationPack = {
      certificationId: '', // Placeholder, will set to hash
      tenant_id,
      company_id,
      snapshotSequence: sequence,
      ledgerHash: (tb as any).ledgerHash || 'MOCK_LEDGER_ROOT',
      reportHashes,
      intelligenceHashes,
      totalRootHash,
      certifiedAt: new Date(),
      certifiedBy: user_id,
      status: 'SEALED',
      metadata: {
        fiscalPeriodId,
        correlation_id,
      },
    };

    // STEP 3: Generate Final certificationHash
    const certificationHash = this.sha256(this.stableSerialize(pack));
    pack.certificationId = certificationHash;

    // STEP 4: Persist with id = certificationHash in TRANSACTION
    try {
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.finance_certifications.create({
          data: {
            id: certificationHash,
            tenant_id: tenant_id,
            snapshot_id: snapshotId,
            certification_hash: certificationHash,
            payload: pack as any,
            created_at: new Date(),
          },
        });

        // MANDATORY CHECK: id MUST EQUAL certificationHash
        if (created.certification_hash !== created.id) {
          throw new Error('Certification ID mismatch: id MUST equal certificationHash');
        }

        this.logger.log(`[DB] INSERT FinancialCertification id=${created.id}`, correlation_id);
      });
    } catch (err) {
      if (err.code === 'P2002') {
        this.logger.warn(`[CONCURRENCY] FinancialCertification unique constraint caught for snapshot ${snapshotId}. Falling back to fetch.`, correlation_id);
        const lateExisting = await this.prisma.finance_certifications.findUnique({
          where: {
            tenant_id_snapshot_id: {
              tenant_id: tenant_id,
              snapshot_id: snapshotId,
            },
          },
        });
        if (lateExisting) {
          return lateExisting.payload as unknown as FinancialCertificationPack;
        }
      }
      throw err;
    }



    return Object.freeze(pack);
  }


  async getCertification(id: string): Promise<FinancialCertificationPack | null> {
    const cert = await this.prisma.finance_certifications.findUnique({ where: { id } });
    return cert ? (cert.payload as unknown as FinancialCertificationPack) : null;
  }

  /**
   * Cryptographic Integrity Verification for Certifications
   */
  async verifyCertification(id: string): Promise<{ valid: boolean; reason?: string; expectedHash: string; actualHash: string }> {
    const cert = await this.prisma.finance_certifications.findUnique({ where: { id } });
    if (!cert) throw new Error('Certification not found');

    const actualHash = this.sha256(this.stableSerialize(cert.payload));

    const valid = actualHash === cert.certification_hash;
    if (!valid) {
      this.logger.error(`[INTEGRITY_FAILURE] FinancialCertification ${id} hash mismatch! Expected: ${cert.certification_hash}, Actual: ${actualHash}`);
    }

    return {
      valid,
      reason: valid ? undefined : 'HASH_MISMATCH',
      expectedHash: cert.certification_hash,
      actualHash,
    };
  }


}
