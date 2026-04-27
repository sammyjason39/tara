import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";

export interface PayrollBreakdown {
  base_salary: number;
  attendance: {
    total_hours: number;
    overtime_hours: number;
    overtime_pay: number;
    lateness_minutes: number;
    lateness_deduction: number;
  };
  sales_bonus: number;
  manual_adjustments: {
    bonuses: number;
    deductions: number;
  };
  gross_income: number;
  tax: {
    rate: number;
    amount: number;
    type: string;
  };
  net_pay: number;
}

@Injectable()
export class PayrollEngineService {
  private readonly logger = new Logger(PayrollEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateEmployeePayroll(
    tenant_id: string,
    employee_id: string,
    period_start: Date,
    period_end: Date
  ): Promise<PayrollBreakdown> {
    this.logger.log(`Calculating payroll for employee ${employee_id} from ${period_start} to ${period_end}`);

    // 1. Fetch Compensation (Base Salary)
    const compensation = await this.prisma.compensations.findUnique({
      where: { employee_id },
    });

    if (!compensation) {
      throw new BadRequestException(`No compensation record found for employee ${employee_id}`);
    }

    const baseSalary = new Decimal(compensation.base_salary || 0);

    // 2. Fetch Attendance Records
    const attendanceRecords = await this.prisma.hr_attendance_records.findMany({
      where: {
        tenant_id,
        employee_id,
        check_in_time: { gte: period_start, lte: period_end },
        status: 'APPROVED'
      }
    });

    let totalHours = 0;
    let overtimeMinutes = 0;
    let latenessMinutes = 0;

    attendanceRecords.forEach(record => {
      totalHours += (record.work_duration_minutes || 0) / 60;
      overtimeMinutes += record.overtime_minutes || 0;
      latenessMinutes += record.lateness_minutes || 0;
    });

    // Mock policy: Overtime = 1.5x hourly rate, Lateness = flat deduction for now
    // In a real system, these would come from hr_work_schedules or tenant settings
    const hourlyRate = baseSalary.div(160); // Assuming 160 hours/month
    const overtimePay = hourlyRate.mul(1.5).mul(overtimeMinutes / 60);
    const latenessDeduction = hourlyRate.mul(latenessMinutes / 60);

    // 3. Fetch Sales Bonuses
    const salesBonuses = await this.prisma.hr_sales_bonuses.findMany({
      where: {
        tenant_id,
        employee_id,
        status: 'PENDING',
        created_at: { gte: period_start, lte: period_end }
      }
    });

    const totalSalesBonus = salesBonuses.reduce(
      (sum, bonus) => sum.plus(new Decimal(bonus.amount)),
      new Decimal(0)
    );

    // 4. Fetch Manual Adjustments
    const manualAdjustments = await this.prisma.hr_payroll_adjustments.findMany({
      where: {
        tenant_id,
        employee_id,
        status: 'PENDING',
        created_at: { gte: period_start, lte: period_end }
      }
    });

    let totalManualBonus = new Decimal(0);
    let totalManualDeduction = new Decimal(0);

    manualAdjustments.forEach((adj: any) => {
      if (adj.type === 'BONUS') totalManualBonus = totalManualBonus.plus(new Decimal(adj.amount));
      else if (adj.type === 'DEDUCTION') totalManualDeduction = totalManualDeduction.plus(new Decimal(adj.amount));
    });

    // 5. Calculate Gross
    const grossIncome = baseSalary
      .plus(overtimePay)
      .plus(totalSalesBonus)
      .plus(totalManualBonus)
      .minus(latenessDeduction);

    // 6. Calculate Tax
    const taxInfo = await this.calculateTax(tenant_id, grossIncome);

    const netPay = grossIncome.minus(totalManualDeduction).minus(taxInfo.amount);

    return {
      base_salary: baseSalary.toNumber(),
      attendance: {
        total_hours: totalHours,
        overtime_hours: overtimeMinutes / 60,
        overtime_pay: overtimePay.toNumber(),
        lateness_minutes: latenessMinutes,
        lateness_deduction: latenessDeduction.toNumber()
      },
      sales_bonus: totalSalesBonus.toNumber(),
      manual_adjustments: {
        bonuses: totalManualBonus.toNumber(),
        deductions: totalManualDeduction.toNumber()
      },
      gross_income: grossIncome.toNumber(),
      tax: {
        rate: taxInfo.rate,
        amount: taxInfo.amount.toNumber(),
        type: taxInfo.type
      },
      net_pay: netPay.toNumber()
    };
  }

  private async calculateTax(tenant_id: string, amount: Decimal): Promise<{ rate: number; amount: Decimal; type: string }> {
    const config = await this.prisma.finance_tax_configs.findFirst({
      where: { tenant_id, is_enabled: true }
    });

    if (!config || config.tax_type === 'NONE') {
      return { rate: 0, amount: new Decimal(0), type: 'NONE' };
    }

    if (config.tax_type === 'PERCENT') {
      const rate = (config.rules_json as any)?.rate || 0;
      return {
        rate,
        amount: amount.mul(rate).div(100),
        type: 'PERCENT'
      };
    }

    if (config.tax_type === 'BRACKET') {
      const brackets = (config.rules_json as any)?.brackets || [];
      // Simple bracket logic: find the highest bracket that applies
      // Better logic would be progressive, but this follows the "plan" for now
      let applicableRate = 0;
      for (const bracket of brackets) {
        if (amount.gte(bracket.min) && (!bracket.max || amount.lte(bracket.max))) {
          applicableRate = bracket.rate;
          break;
        }
      }
      return {
        rate: applicableRate,
        amount: amount.mul(applicableRate).div(100),
        type: 'BRACKET'
      };
    }

    return { rate: 0, amount: new Decimal(0), type: 'NONE' };
  }
}
