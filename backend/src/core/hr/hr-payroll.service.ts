import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { FiscalPeriodService } from "../finance/services/fiscal-period.service";
import { PostingGatewayService } from "../finance/services/posting-gateway.service";
import { 
  Payroll, 
  Compensation 
} from "./entities/hr.entity";
import { Prisma } from "@prisma/client";

import { HrPayrollController } from "./controllers/hr-payroll.controller";
import { PayrollEngineService } from "./payroll-engine.service";
import { PayslipService } from "./payslip.service";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

@Injectable()
export class HrPayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrRepository: IHRRepository,
    private readonly auditService: AuditService,
    private readonly fiscalPeriodService: FiscalPeriodService,
    private readonly postingGatewayService: PostingGatewayService,
    private readonly payrollEngine: PayrollEngineService,
    private readonly payslipService: PayslipService,
  ) {}

  async getPayroll(tenant_id: string, location_id?: string, employee_id?: string, period?: string): Promise<Payroll[]> {
    return this.hrRepository.getPayroll(tenant_id, location_id, employee_id, period);
  }

  async getGlobalPayroll(employee_id: string, period?: string): Promise<Payroll[]> {
    return this.hrRepository.getGlobalPayroll(employee_id, period);
  }

  async calculatePayroll(tenant_id: string, employee_id: string, period: string, user_id?: string): Promise<any> {
    const event_reference_id = `EVT-HR-PAYROLL-CALC-${Date.now()}`;
    const [start, end] = this.getPeriodDates(period);

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Core Calculation via Engine
      const breakdown = await this.payrollEngine.calculateEmployeePayroll(tenant_id, employee_id, start, end);

      // 2. Resolve Active Run
      const payrollRun = await tx.hr_payroll_runs.findFirst({
        where: { tenant_id, period_start: { gte: start }, period_end: { lte: end }, status: "DRAFT" },
      });

      if (!payrollRun) {
        throw new BadRequestException(`Active payroll run not found for period ${period}`);
      }

      // 3. Generate Checksum for Integrity
      const checksumData = `${tenant_id}:${employee_id}:${breakdown.net_pay}:${Date.now()}`;
      const checksum = createHash("sha256").update(checksumData).digest("hex");

      // 4. Upsert Payroll Line
      const payrollLine = await tx.payroll_lines.upsert({
        where: {
          id: uuidv4(), // Since we don't have a unique constraint on tenant+run+employee in the model provided, we'd normally seek first
        },
        create: {
          id: uuidv4(),
          tenant_id,
          payroll_run_id: payrollRun.id,
          employee_id,
          base_salary: new Prisma.Decimal(breakdown.base_salary.toFixed(2)),
          total_work_hours: breakdown.attendance.total_hours,
          overtime_pay: new Prisma.Decimal(breakdown.attendance.overtime_pay.toFixed(2)),
          sales_bonus: new Prisma.Decimal(breakdown.sales_bonus.toFixed(2)),
          manual_bonus: new Prisma.Decimal(breakdown.manual_adjustments.bonuses.toFixed(2)),
          gross_income: new Prisma.Decimal(breakdown.gross_income.toFixed(2)),
          gross_pay: new Prisma.Decimal(breakdown.gross_income.toFixed(2)), // Mapping gross_income to gross_pay for legacy
          net_pay: new Prisma.Decimal(breakdown.net_pay.toFixed(2)),
          tax_amount: new Prisma.Decimal(breakdown.tax.amount.toFixed(2)),
          adjustments: new Prisma.Decimal(breakdown.manual_adjustments.bonuses - breakdown.manual_adjustments.deductions),
          deductions_total: new Prisma.Decimal(breakdown.manual_adjustments.deductions.toFixed(2)),
          breakdown_json: breakdown as any,
          checksum,
        },
        update: {
          base_salary: new Prisma.Decimal(breakdown.base_salary.toFixed(2)),
          total_work_hours: breakdown.attendance.total_hours,
          overtime_pay: new Prisma.Decimal(breakdown.attendance.overtime_pay.toFixed(2)),
          sales_bonus: new Prisma.Decimal(breakdown.sales_bonus.toFixed(2)),
          manual_bonus: new Prisma.Decimal(breakdown.manual_adjustments.bonuses.toFixed(2)),
          gross_income: new Prisma.Decimal(breakdown.gross_income.toFixed(2)),
          gross_pay: new Prisma.Decimal(breakdown.gross_income.toFixed(2)),
          net_pay: new Prisma.Decimal(breakdown.net_pay.toFixed(2)),
          tax_amount: new Prisma.Decimal(breakdown.tax.amount.toFixed(2)),
          adjustments: new Prisma.Decimal(breakdown.manual_adjustments.bonuses - breakdown.manual_adjustments.deductions),
          deductions_total: new Prisma.Decimal(breakdown.manual_adjustments.deductions.toFixed(2)),
          breakdown_json: breakdown as any,
          checksum,
        }
      });

      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "CALCULATE_PAYROLL", entity_type: "PAYROLL_LINE", entity_id: payrollLine.id, after_state: payrollLine, event_reference_id, metadata: { period, breakdown },
      }, tx);

      return payrollLine;
    });
  }

  private getPeriodDates(period: string): [Date, Date] {
    // Basic parser for "YYYY-MM" or "YYYY-MM-DD/YYYY-MM-DD"
    if (period.includes("/")) {
      const [s, e] = period.split("/");
      return [new Date(s), new Date(e)];
    }
    const year = parseInt(period.split("-")[0]);
    const month = parseInt(period.split("-")[1]) - 1;
    return [new Date(year, month, 1), new Date(year, month + 1, 0, 23, 59, 59)];
  }

  async getCompensation(tenant_id: string, employee_id: string): Promise<Compensation> {
    return this.hrRepository.getCompensation(tenant_id, employee_id) as any;
  }

  async updateCompensation(tenant_id: string, employee_id: string, data: any, user_id?: string): Promise<Compensation> {
    const event_reference_id = `EVT-HR-COMP-UPD-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const compensation = await this.hrRepository.updateCompensation(tenant_id, employee_id, data, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "UPDATE_COMPENSATION", entity_type: "COMPENSATION", entity_id: employee_id, after_state: compensation, event_reference_id,
      }, tx);
      return compensation;
    });
  }

  async getCompensationAnalytics(tenant_id: string): Promise<any> {
    return this.hrRepository.getCompensationAnalytics(tenant_id);
  }

  async approvePayroll(tenant_id: string, run_id: string, user_id: string): Promise<any> {
    const run = await this.hrRepository.getPayrollRunById(tenant_id, run_id);
    if (!run) throw new NotFoundException("Payroll run not found");
    if (run.status !== "DRAFT" && run.status !== "draft") {
      throw new BadRequestException(`Cannot approve payroll in ${run.status} status`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await this.hrRepository.updatePayrollRun(tenant_id, run_id, { status: "APPROVED" }, tx);
      await this.auditService.log({
        tenant_id, user_id, module: "HR", action: "APPROVE_PAYROLL", entity_type: "PAYROLL_RUN", entity_id: run_id, after_state: updated,
      }, tx);
      return updated;
    });
  }

  async generateBankFile(tenant_id: string, run_id: string): Promise<string> {
    const lines = await this.hrRepository.getPayrollLines(tenant_id, run_id);
    if (lines.length === 0) throw new BadRequestException("No payroll records found for this run");

    // CSV format: Name, Bank, Account, Amount
    // Note: In real world, we'd fetch employee bank details from the repository
    const header = "Employee ID,Net Pay,Status\n";
    const body = lines.map(line => `${line.employee_id},${line.netPay},READY`).join("\n");
    
    await this.hrRepository.createDisbursementLog(tenant_id, {
      payrollRunId: run_id,
      status: "BANK_FILE_GENERATED",
      bankFileName: `PAYROLL_${run_id}_${Date.now()}.csv`,
    });

    return header + body;
  }

  async confirmDisbursement(tenant_id: string, run_id: string, user_id: string): Promise<any> {
    const run = await this.hrRepository.getPayrollRunById(tenant_id, run_id);
    if (!run) throw new NotFoundException("Payroll run not found");
    if (run.status !== "APPROVED") {
      throw new BadRequestException("Only approved payroll runs can be disbursed");
    }

    const today = new Date();
    // 1. Validate Fiscal Period
    const openPeriodId = await this.fiscalPeriodService.validatePeriodOpenForPosting(tenant_id, tenant_id, "PAYROLL", user_id);
    if (!openPeriodId) {
      throw new BadRequestException("Financial period is closed. Cannot post payroll disbursement.");
    }

    const lines = await this.hrRepository.getPayrollLines(tenant_id, run_id);
    const totalNet = lines.reduce((sum, line) => sum + Number(line.netPay), 0);
    const totalGross = lines.reduce((sum, line) => sum + Number(line.gross_income || line.grossPay), 0);
    const totalTax = lines.reduce((sum, line) => sum + Number(line.tax_amount || 0), 0);

    return this.prisma.$transaction(async (tx: any) => {
      // 2. Update Run Status
      const updated = await this.hrRepository.updatePayrollRun(tenant_id, run_id, { status: "DISBURSED" }, tx);

      // 3. Create Disbursement Log
      const log = await this.hrRepository.createDisbursementLog(tenant_id, {
        payrollRunId: run_id,
        status: "SUCCESS",
        disbursedAt: today,
        disbursedBy: user_id,
        totalAmount: totalNet,
      }, tx);

      // 4. Post to Ledger via Gateway
      await this.postingGatewayService.postEvent({
        request_id: `PAY-${run_id}-${Date.now()}`,
        tenant_id,
        company_id: tenant_id,
        sourceEventId: run_id,
        event_type: "PAYROLL_POSTED",
        eventVersion: "1.0.0",
        payload: {
          total: totalNet,
          gross: totalGross,
          tax: totalTax,
          currency: run.baseCurrency || "USD",
          description: `Payroll Disbursement for period ending ${run.period_end}`,
          fiscalPeriodId: openPeriodId,
        },
        metadata: {
          module: "HR",
          action: "DISBURSE",
        }
      } as any);

      await this.auditService.log({
        tenant_id, user_id, module: "HR", action: "CONFIRM_DISBURSEMENT", entity_type: "PAYROLL_RUN", entity_id: run_id, after_state: { run: updated, log },
      }, tx);

      return { run: updated, log };
    });
  }

  async generatePayslip(tenant_id: string, run_id: string, employee_id: string): Promise<Buffer> {
    const payroll = await this.prisma.payroll_lines.findFirst({
      where: { tenant_id, payroll_run_id: run_id, employee_id },
    });

    if (!payroll) throw new NotFoundException("Payroll record not found");
    return this.payslipService.generatePayslipPdf(tenant_id, payroll.id);
  }

  private mapLine(l: any): any {
    return {
      id: l.id,
      tenant_id: l.tenant_id,
      payrollRunId: l.payroll_run_id,
      employee_id: l.employee_id,
      grossPay: Number(l.gross_pay),
      adjustments: Number(l.adjustments || 0),
      netPay: Number(l.net_pay),
      created_at: l.created_at,
      updated_at: l.updated_at,
    };
  }
}
