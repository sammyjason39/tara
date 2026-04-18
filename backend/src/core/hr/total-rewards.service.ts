import { Injectable, Logger } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";

@Injectable()
export class TotalRewardsService {
  private readonly logger = new Logger(TotalRewardsService.name);

  constructor(private readonly repository: IHRRepository) {}

  async calculateTotalRewards(tenant_id: string, employee_id: string) {
    this.logger.log(`Calculating total rewards for employee ${employee_id}`);
    
    // 1. Get Base Salary
    const employee = await this.repository.getEmployeeById(tenant_id, employee_id);
    if (!employee) throw new Error("Employee not found");
    
    const base_salary = employee.base_salary || 0;
    
    // 2. Get active benefits and calculate employer portion
    const enrollments = await this.repository.getEmployeeBenefits(tenant_id, employee_id);
    const activeBenefits = enrollments.filter(e => e.status === "ACTIVE");
    
    const totalBenefitValue = activeBenefits.reduce((sum, e) => {
      const plan = e.plan;
      if (!plan) return sum;
      
      // If frequency is monthly, annualize it
      const multiplier = plan.frequency === "MONTHLY" ? 12 : 1;
      return sum + (plan.employerContribution * multiplier);
    }, 0);

    return {
      employee_id,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      base_salary,
      totalBenefitValue,
      totalRewards: base_salary + totalBenefitValue,
      currency: employee.currency || "USD",
      breakdown: [
        { label: "Base Salary", value: base_salary, category: "Cash" },
        ...activeBenefits.map(e => ({
          label: e.plan?.name || "Benefit",
          value: (e.plan?.employerContribution || 0) * (e.plan?.frequency === "MONTHLY" ? 12 : 1),
          category: "Non-Cash"
        }))
      ]
    };
  }

  async getRecommendedBenefits(tenant_id: string, employee_id: string) {
    this.logger.log(`Generating benefit recommendations for ${employee_id}`);
    
    const allPlans = await this.repository.getBenefitPlans(tenant_id);
    const currentBenefits = await this.repository.getEmployeeBenefits(tenant_id, employee_id);
    const currentPlanIds = currentBenefits.map(b => b.planId);
    
    // Suggest plans employee isn't yet enrolled in
    return allPlans.filter(p => !currentPlanIds.includes(p.id));
  }
}
