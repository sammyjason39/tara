import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { Employee } from "./entities/employee.entity";

type BudgetData = any;
type BudgetPlan = any;
type LaborCostHistory = any;

@Injectable()
export class LaborCostService {
  private readonly logger = new Logger(LaborCostService.name);

  constructor(private readonly repository: IHRRepository) {}

  async projectLaborCosts(tenant_id: string, department_id: string, periods: number) {
    this.logger.log(`Projecting labor costs for department ${department_id} over ${periods} periods`);
    
    // 1. Get current employees in department
    const result = await this.repository.getEmployees(tenant_id, undefined, 1, 1000);
    const employees = result.data;
    const deptEmployees = employees.filter((e: Employee) => e.department_id === department_id);
    
    // 2. Calculate current monthly baseline
    // (Salary / 12 * (1 + 0.3 for benefits/taxes))
    const currentMonthlyBase = deptEmployees.reduce((sum: number, e: Employee) => {
      return sum + (e.base_salary || 0) / 12;
    }, 0);
    
    const TAX_BENEFIT_MULTIPLIER = 1.3;
    const currentMonthlyTotal = currentMonthlyBase * TAX_BENEFIT_MULTIPLIER;

    // 3. Get headcount plans for the period
    const budgetData: BudgetData | null = await this.repository.getDepartmentBudgetData(tenant_id, department_id);
    const plans: BudgetPlan[] = budgetData?.headcountPlans || [];
    
    const projections = [];
    const now = new Date();
    
    for (let i = 1; i <= periods; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      
      // Calculate new hires cost starting from their planned hire date
      const newHiresMonthlyBase = plans
        .filter((p: BudgetPlan) => new Date(p.planned_hire_date) <= targetDate)
        .reduce((sum: number, p: BudgetPlan) => sum + (p.projected_salary / 12) * p.target_headcount, 0);
      
      const monthlyTotal = (currentMonthlyBase + newHiresMonthlyBase) * TAX_BENEFIT_MULTIPLIER;
      
      projections.push({
        period: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`,
        existingStaffCost: Number(currentMonthlyTotal.toFixed(2)),
        plannedStaffCost: Number((newHiresMonthlyBase * TAX_BENEFIT_MULTIPLIER).toFixed(2)),
        totalProjectedCost: Number(monthlyTotal.toFixed(2)),
        growthIndex: currentMonthlyTotal > 0 ? Number(((monthlyTotal / currentMonthlyTotal) - 1).toFixed(4)) : 0
      });
    }

    return {
      department_id,
      departmentName: deptEmployees[0]?.department_id || "Unknown",
      currency: "USD",
      monthlyBaseTotal: Number(currentMonthlyTotal.toFixed(2)),
      projections,
    };
  }

  async simulateInflationImpact(tenant_id: string, inflationRate: number) {
    this.logger.log(`Simulating inflation impact with rate ${inflationRate}`);
    
    const result = await this.repository.getEmployees(tenant_id, undefined, 1, 1000);
    const employees = result.data;
    const totalAnnualBase = employees.reduce((sum: number, e: Employee) => sum + (e.base_salary || 0), 0);
    
    const baselineMultiplier = 1.30;
    const newMultiplier = baselineMultiplier + (inflationRate / 100);
    
    const standardCost = totalAnnualBase * baselineMultiplier;
    const inflatedCost = totalAnnualBase * newMultiplier;
    
    return {
      totalEmployees: employees.length,
      totalAnnualBaseSalary: totalAnnualBase,
      baselineTotalCost: Number(standardCost.toFixed(2)),
      projectedInflatedCost: Number(inflatedCost.toFixed(2)),
      annualDelta: Number((inflatedCost - standardCost).toFixed(2)),
      monthlyDelta: Number(((inflatedCost - standardCost) / 12).toFixed(2)),
      impactSeverity: inflationRate > 5 ? 'HIGH' : (inflationRate > 2 ? 'MEDIUM' : 'LOW'),
      message: `A ${inflationRate}% increase in benefit/tax inflation would increase annual labor costs by ${Number((inflatedCost - standardCost).toFixed(2))}.`,
    };
  }

  async getBudgetVarianceForecast(tenant_id: string, department_id: string) {
    this.logger.log(`Forecasting budget variance for department ${department_id}`);
    
    const budgetData: BudgetData | null = await this.repository.getDepartmentBudgetData(tenant_id, department_id);
    if (!budgetData) throw new NotFoundException(`No active budget found for department ${department_id}`);

    const history: LaborCostHistory[] = await this.repository.getActualLaborCostHistory(tenant_id, department_id, 3);
    const avgMonthlyActual = history.length > 0 
      ? history.reduce((sum: number, h: LaborCostHistory) => sum + h.totalCost, 0) / history.length
      : 0;

    const annualBudget = budgetData.totalDepartmentBudget;
    const monthlyBudget = annualBudget / 12;
    const variance = avgMonthlyActual - monthlyBudget;
    
    const variancePercentage = monthlyBudget > 0 ? (variance / monthlyBudget) * 100 : 0;
    const isOverBudget = variance > 0;
    const burnRateStatus = variancePercentage > 10 ? 'CRITICAL' : (isOverBudget ? 'WARNING' : 'STABLE');

    return {
      department_id,
      fiscal_year: budgetData.fiscal_year,
      monthlyBudget: Number(monthlyBudget.toFixed(2)),
      monthlyActualAverage: Number(avgMonthlyActual.toFixed(2)),
      monthlyVariance: Number(variance.toFixed(2)),
      variancePercentage: Number(variancePercentage.toFixed(2)),
      burnRateStatus,
      atRiskAnnualOverrun: Number((variance * 12).toFixed(2)),
      recommendation: burnRateStatus === 'CRITICAL' 
        ? "IMMEDIATE ACTION REQUIRED: Actual spend significantly exceeds budget. Freeze non-essential hiring." 
        : (isOverBudget ? "WARNING: Minor budget overrun detected. Monitor headcount additions." : "Departmental spend is healthy."),
    };
  }
}
