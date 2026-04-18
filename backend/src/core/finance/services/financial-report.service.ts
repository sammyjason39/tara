import { Injectable, Inject, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { ReportDefinitionRegistry } from '../domain/report-definition.registry';
import { ProjectionCheckpointService } from './projection-checkpoint.service';
import { IFinancialReportSnapshotRepository } from '../repositories/interfaces/financial-report-snapshot.repository.interface';
import { ProfitLossService } from './profit-loss.service';
import { BalanceSheetService } from './balance-sheet.service';
import { CashFlowService } from './cash-flow.service';

@Injectable()
export class FinancialReportService {
  private readonly logger = new Logger(FinancialReportService.name);

  constructor(
    private readonly registry: ReportDefinitionRegistry,
    private readonly checkpointService: ProjectionCheckpointService,
    private readonly plService: ProfitLossService,
    private readonly bsService: BalanceSheetService,
    private readonly cfService: CashFlowService,
    @Inject('IFinancialReportSnapshotRepository')
    private readonly snapshotRepo: IFinancialReportSnapshotRepository,
  ) {}

  async getReport(tenant_id: string, company_id: string, type: string, fiscalPeriodId: string, dimensions?: Record<string, string>): Promise<any> {
    const definition = this.registry.getDefinition(type);
    if (!definition) throw new Error(`Unknown report type: ${type}`);

    const parametersHash = this.computeParametersHash(fiscalPeriodId, dimensions);
    const latestCheckpoint = await this.checkpointService.getLatestCheckpoint(tenant_id, company_id);
    const cached = await this.snapshotRepo.findLatest(tenant_id, company_id, type, fiscalPeriodId, parametersHash);

    if (cached && (cached.projectionCheckpointSequence as any) === latestCheckpoint) {
      if (cached.tenant_id === tenant_id && cached.company_id === company_id) {
        return this.decompressReport(cached.compressedData || '');
      }
    }

    await this.validateAccess(tenant_id, company_id, dimensions?.branch_id);

    let reportData: any;
    switch (type) {
      case 'PROFIT_LOSS':
        reportData = await this.plService.generate(tenant_id, company_id, fiscalPeriodId, dimensions);
        break;
      case 'BALANCE_SHEET':
        reportData = await this.bsService.generate(tenant_id, company_id, fiscalPeriodId, dimensions);
        break;
      case 'CASH_FLOW':
        reportData = await this.cfService.generate(tenant_id, company_id, fiscalPeriodId);
        break;
      default:
        throw new Error(`Report type ${type} not supported`);
    }

    await this.cacheReport(tenant_id, company_id, type, fiscalPeriodId, parametersHash, reportData, latestCheckpoint, definition.version);

    return reportData;
  }

  private computeParametersHash(fiscalPeriodId: string, dimensions?: Record<string, string>): string {
    const payload = JSON.stringify({ fiscalPeriodId, dimensions: dimensions || {} });
    return createHash('sha256').update(payload).digest('hex');
  }

  private async cacheReport(
    tenant_id: string, 
    company_id: string,
    type: string, 
    fiscalPeriodId: string, 
    paramsHash: string, 
    data: any, 
    checkpoint: number,
    version: string
  ): Promise<void> {
    const serialized = JSON.stringify(data);
    const compressed = Buffer.from(serialized).toString('base64');

    await this.snapshotRepo.create({
      tenant_id,
      company_id,
      reportType: type,
      reportVersion: Number(version) || 1,
      fiscalPeriodId,
      reportParametersHash: paramsHash,
      compressedData: compressed,
      projectionCheckpointSequence: checkpoint,
    });
  }

  private decompressReport(compressed: string): any {
    const serialized = Buffer.from(compressed, 'base64').toString('utf-8');
    return JSON.parse(serialized);
  }

  private async validateAccess(tenant_id: string, company_id: string, branch_id?: string): Promise<void> {
    if (!tenant_id || !company_id) throw new Error(`Access denied`);
  }
}
