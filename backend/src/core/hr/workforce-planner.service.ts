import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";

@Injectable()
export class WorkforcePlannerService {
  private readonly logger = new Logger(WorkforcePlannerService.name);

  constructor(private readonly repository: IHRRepository) {}

  async calculateWhatIfAnalysis(tenant_id: string, scenario_id: string) {
    this.logger.log(`Running What-If analysis for scenario ${scenario_id}`);

    const [currentComp, plans] = await Promise.all([
      this.repository.getCompensationAnalytics(tenant_id),
      this.repository.getHeadcountPlans(tenant_id, scenario_id),
    ]);

    const currentMonthlySpend = currentComp.totalMonthlySpend || 0;
    const additionalMonthlySpend = plans.reduce(
      (acc, plan) => acc + (plan.projected_salary / 12) * plan.target_headcount,
      0,
    );

    const projectedMonthlySpend = currentMonthlySpend + additionalMonthlySpend;

    return {
      currentMonthlySpend,
      projectedMonthlySpend,
      difference: additionalMonthlySpend,
      percentageIncrease: currentMonthlySpend > 0 ? (additionalMonthlySpend / currentMonthlySpend) * 100 : 0,
      headcountIncrease: plans.reduce((acc, p) => acc + p.target_headcount, 0),
    };
  }

  async generateCostProjections(tenant_id: string, scenario_id: string, months: number = 24) {
    this.logger.log(`Generating ${months}-month cost projections for scenario ${scenario_id}`);

    const [currentComp, plans] = await Promise.all([
      this.repository.getCompensationAnalytics(tenant_id),
      this.repository.getHeadcountPlans(tenant_id, scenario_id),
    ]);

    const projections = [];
    const now = new Date();
    const currentMonthly = currentComp.totalMonthlySpend || 0;

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthLabel = targetDate.toISOString().substring(0, 7);

      let incrementalSpend = 0;
      plans.forEach((plan) => {
        if (new Date(plan.planned_hire_date) <= targetDate) {
          incrementalSpend += (plan.projected_salary / 12) * plan.target_headcount;
        }
      });

      projections.push({
        month: monthLabel,
        baseSpend: currentMonthly,
        incrementalSpend,
        totalSpend: currentMonthly + incrementalSpend,
      });
    }

    return projections;
  }

  /**
   * Assess employee readiness for transitioning to a target department/role
   */
  async assessTalentMobility(tenant_id: string, employee_id: string, targetDeptId: string) {
    this.logger.log(`Assessing talent mobility for ${employee_id} to ${targetDeptId}`);

    const employee = await this.repository.getEmployeeById(tenant_id, employee_id);
    if (!employee) throw new NotFoundException(`Employee ${employee_id} not found`);

    const [skills, performance, compliance] = await Promise.all([
      this.repository.getEmployeeSkills(tenant_id, employee_id),
      this.repository.getEmployeePerformanceHistory(tenant_id, employee_id),
      this.repository.getComplianceDocuments(tenant_id, employee_id),
    ]);

    // Mock mobility logic: 
    // - Readiness = (Skills Coverage * 0.5) + (Avg Performance * 0.3) + (Compliance Status * 0.2)
    const avgPerformance = performance.length > 0 ? performance.reduce((s, r) => s + (r.rating || 3), 0) / performance.length : 3;
    const verifiedDocs = compliance.filter(d => d.verification_status === 'VERIFIED').length;
    const docStability = compliance.length > 0 ? verifiedDocs / compliance.length : 1;

    const readinessScore = (Number((avgPerformance / 5).toFixed(2)) * 0.4) + (docStability * 0.2) + 0.4; // Base 40% for tenure

    return {
      employee_id,
      full_name: `${employee.first_name} ${employee.last_name}`,
      currentDepartmentId: employee.department_id,
      targetDepartmentId: targetDeptId,
      readinessScore: Number(readinessScore.toFixed(2)),
      recommendation: readinessScore > 0.8 ? 'READY_FOR_TRANSFER' : (readinessScore > 0.6 ? 'POTENTIAL_WITH_UPSKILLING' : 'WATCH_LIST'),
      risks: docStability < 1 ? ['OUTSTANDING_COMPLIANCE_DOCS'] : [],
      strategicValue: avgPerformance > 4 ? 'HIGH_POTENTIAL' : 'CORE_TALENT'
    };
  }

  /**
   * Platform-wide workforce dynamics (Hires vs Exits vs Transfers)
   */
  async getGlobalWorkforceDynamics(tenant_id: string) {
    this.logger.log(`Fetching workforce dynamics for tenant ${tenant_id}`);

    const result = await this.repository.getEmployees(tenant_id, undefined, 1, 1000);
    const employees = result.data;
    const active = employees.filter(e => e.status === 'active').length;
    const probation = employees.filter(e => e.status === 'probation').length;
    const terminated = employees.filter(e => e.status === 'terminated').length;

    return {
      tenant_id,
      metrics: {
        currentHeadcount: active + probation,
        activeRetentionRate: Number((active / (active + terminated || 1)).toFixed(2)),
        growthTrajectory: probation > 0 ? 'EXPANDING' : 'STABLE',
      },
      distribution: {
        active,
        probation,
        terminated
      }
    };
  }
}
