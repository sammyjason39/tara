import { Injectable, Logger } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { AnalyticsService } from "./analytics.service";

@Injectable()
export class SuccessionService {
  private readonly logger = new Logger(SuccessionService.name);

  constructor(
    private readonly repository: IHRRepository,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async getPlans(tenant_id: string) {
    return this.repository.getSuccessionPlans(tenant_id);
  }

  async getPlan(tenant_id: string, position_id: string) {
    return this.repository.getSuccessionPlan(tenant_id, position_id);
  }

  async createPlan(tenant_id: string, data: any) {
    return this.repository.createSuccessionPlan(tenant_id, data);
  }

  async getModelSuccession(tenant_id: string, position_id: string) {
    this.logger.log(`Modeling succession for position ${position_id}`);

    const [position, result] = await Promise.all([
      this.repository.getPositions(tenant_id).then(pos => pos.find(p => p.id === position_id)),
      this.repository.getEmployees(tenant_id, undefined, 1, 1000),
    ]);

    if (!position) throw new Error("Position not found");

    // Filter potential candidates (one grade below, high performance)
    // In a real system, we'd look at job grades. Here we'll simulate by matching department.
    const departmentLevelEmployees = result.data.filter(e => e.department_id === position.department_id);
    
    // Simulate scoring logic
    const candidates = departmentLevelEmployees.map(e => {
      const score = Math.floor(Math.random() * 40) + 60; // 60-100
      let readiness = "READY_1_2_YEARS";
      if (score > 90) readiness = "READY_NOW";
      else if (score < 70) readiness = "READY_3_PLUS_YEARS";

      return {
        employee_id: e.id,
        name: e.first_name + " " + e.last_name,
        currentRole: e.job_title,
        readinessScore: score,
        readiness,
        skillGaps: ["Leadership", "Budgeting"].slice(0, Math.floor(Math.random() * 3)),
      };
    });

    return candidates.sort((a, b) => b.readinessScore - a.readinessScore);
  }

  async assessBenchStrength(tenant_id: string, department_id?: string) {
    return this.repository.getBenchStrength(tenant_id, department_id);
  }

  async nominateSuccessor(tenant_id: string, data: any) {
    this.logger.log(`Nominating successor ${data.employee_id} for plan ${data.planId}`);
    
    // Check flight risk from AnalyticsService for better decision support
    const risks = await this.analyticsService.getFlightRisks(tenant_id);
    const candidateRisk = risks.find(r => r.employee_id === data.employee_id);
    
    const candidateData = {
      ...data,
      riskOfLoss: candidateRisk?.riskScore > 0.7 ? "HIGH" : (candidateRisk?.riskScore > 0.4 ? "MEDIUM" : "LOW"),
    };

    return this.repository.addSuccessionCandidate(tenant_id, candidateData);
  }
}
