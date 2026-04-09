import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

import { IComplianceRule, IComplianceExporter, ComplianceCalculationResult } from './compliance.interface';

// Indonesia
import { BpjsKesehatanRules } from './indonesia/bpjs-kesehatan.rules';
import { BpjsKetenagakerjaanRules } from './indonesia/bpjs-ketenagakerjaan.rules';
import { TaxPph21Rules } from './indonesia/tax-pph21.rules';
import { IndonesiaComplianceExporter } from './indonesia/indonesia.exporter';

// Singapore
import { CpfRules } from './singapore/cpf.rules';
import { CpfExporter } from './singapore/cpf.exporter';

// UAE
import { WpsRules } from './uae/wps.rules';
import { WpsExporter } from './uae/wps.exporter';

/**
 * ComplianceEngineService
 * Phase 2 — Central orchestrator for the Global Compliance Engine.
 *
 * Routes calculation and export requests to the correct country-specific
 * rule engine and exporter. All modules are tenant-aware and period-bound.
 *
 * Supported modules:
 *   ID: BPJS_KESEHATAN, BPJS_KETENAGAKERJAAN, PPH21
 *   SG: CPF
 *   AE: WPS
 */
@Injectable()
export class ComplianceEngineService {
  private readonly logger = new Logger(ComplianceEngineService.name);

  // ── Rule Engines (module name → IComplianceRule instance) ───────────────
  private readonly ruleEngines: Record<string, IComplianceRule> = {
    BPJS_KESEHATAN:       new BpjsKesehatanRules(),
    BPJS_KETENAGAKERJAAN: new BpjsKetenagakerjaanRules(),
    PPH21:                new TaxPph21Rules(),
    CPF:                  new CpfRules(),
    WPS:                  new WpsRules(),
  };

  // ── Exporters (country code → IComplianceExporter instance) ─────────────
  private readonly exporters: Record<string, IComplianceExporter> = {
    ID: new IndonesiaComplianceExporter(),
    SG: new CpfExporter(),
    AE: new WpsExporter(),
  };

  // ── Module → Country mapping ─────────────────────────────────────────────
  private readonly moduleCountry: Record<string, string> = {
    BPJS_KESEHATAN:       'ID',
    BPJS_KETENAGAKERJAAN: 'ID',
    PPH21:                'ID',
    CPF:                  'SG',
    WPS:                  'AE',
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List available compliance modules for a given country
   */
  getAvailableModules(country: string): string[] {
    return Object.entries(this.moduleCountry)
      .filter(([, c]) => c === country)
      .map(([mod]) => mod);
  }

  /**
   * Run compliance calculations for the given module and period.
   *
   * @param tenantId  - The tenant/company identifier
   * @param module    - Compliance module key (e.g. 'BPJS_KESEHATAN', 'CPF')
   * @param period    - Period in 'YYYY-MM' format
   */
  async calculate(
    tenantId: string,
    module: string,
    period: string,
  ): Promise<ComplianceCalculationResult> {
    const engine = this.ruleEngines[module];
    if (!engine) {
      throw new BadRequestException(
        `Unknown compliance module: '${module}'. ` +
          `Available: ${Object.keys(this.ruleEngines).join(', ')}`,
      );
    }

    this.logger.log(`Compliance calculate: [${tenantId}] module=${module} period=${period}`);

    // Load employees with compensation data via Prisma
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: { in: ['active', 'probation'] } },
      include: {
        compensations: { select: { baseSalary: true, currency: true } },
      },
    });

    if (employees.length === 0) {
      this.logger.warn(`No active employees found for tenant ${tenantId}`);
    }

    const result = engine.calculate(employees, tenantId, period);

    this.logger.log(
      `Compliance result: ${result.totalEmployees} employees, ` +
        `deductions=${result.totalDeductions}, contributions=${result.totalContributions}`,
    );

    return result;
  }

  /**
   * Export a compliance result in the specified format.
   *
   * @param format  - 'CSV' | 'EXCEL' | 'XML' | 'PDF'
   * @param result  - The ComplianceCalculationResult from calculate()
   */
  export(
    format: 'CSV' | 'EXCEL' | 'XML' | 'PDF',
    result: ComplianceCalculationResult,
  ): string | Buffer {
    const exporter = this.exporters[result.country];
    if (!exporter) {
      throw new BadRequestException(
        `No exporter available for country '${result.country}'.`,
      );
    }

    this.logger.log(`Exporting ${result.module} (${result.period}) as ${format}`);

    switch (format) {
      case 'CSV':   return exporter.exportCSV(result);
      case 'XML':   return exporter.exportXML(result);
      case 'EXCEL': return exporter.exportExcel(result);
      case 'PDF':   return exporter.exportPDF(result);
      default:
        throw new BadRequestException(`Unknown export format: '${format}'`);
    }
  }

  /**
   * Convenience: calculate + export in a single call.
   */
  async calculateAndExport(
    tenantId: string,
    module: string,
    period: string,
    format: 'CSV' | 'EXCEL' | 'XML' | 'PDF',
  ): Promise<{ result: ComplianceCalculationResult; exported: string | Buffer }> {
    const result = await this.calculate(tenantId, module, period);
    const exported = this.export(format, result);
    return { result, exported };
  }

  /**
   * Run all modules for a given country in a single call.
   * Useful for a full monthly payroll compliance run.
   */
  async calculateAll(
    tenantId: string,
    country: string,
    period: string,
  ): Promise<ComplianceCalculationResult[]> {
    const modules = this.getAvailableModules(country);
    if (modules.length === 0) {
      throw new BadRequestException(`No compliance modules configured for country '${country}'.`);
    }

    this.logger.log(`Running all ${modules.length} compliance modules for [${country}] tenant=${tenantId}`);

    const results = await Promise.all(
      modules.map((mod) => this.calculate(tenantId, mod, period)),
    );

    return results;
  }
}
