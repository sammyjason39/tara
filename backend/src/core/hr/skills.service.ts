import { Injectable, Logger } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(private readonly repository: IHRRepository) {}

  async mapInternalTalent(tenant_id: string, skillIds: string[], minProficiency: number = 3) {
    this.logger.log(`Mapping internal talent for skills: ${skillIds.join(", ")}`);
    return this.repository.findTalentBySkills(tenant_id, skillIds, minProficiency);
  }

  async calculateSkillGap(tenant_id: string, employee_id: string, targetRoleId: string) {
    this.logger.log(`Calculating skill gap for employee ${employee_id} against role ${targetRoleId}`);
    
    // In a real system, positions would have required skills. 
    // We'll simulate this by fetching employee skills and comparing to a mock role requirement.
    const employeeSkills = await this.repository.getEmployeeSkills(tenant_id, employee_id);
    
    // Mock target role requirements
    const targetRequirements = [
      { skillName: "TypeScript", minProficiency: 4 },
      { skillName: "NodeJS", minProficiency: 4 },
      { skillName: "Leadership", minProficiency: 3 },
    ];

    const gaps = targetRequirements.map(req => {
      const actual = employeeSkills.find(es => es.skill?.name === req.skillName);
      return {
        skillName: req.skillName,
        required: req.minProficiency,
        actual: actual?.proficiency || 0,
        gap: Math.max(0, req.minProficiency - (actual?.proficiency || 0)),
      };
    });

    return {
      employee_id,
      targetRoleId,
      matchPercentage: (gaps.filter(g => g.gap === 0).length / gaps.length) * 100,
      gaps,
    };
  }

  async verifyProficiency(tenant_id: string, employee_id: string, skill_id: string, verified_by: string) {
    this.logger.log(`Verifying skill ${skill_id} for employee ${employee_id} by ${verified_by}`);
    return this.repository.updateEmployeeSkill(tenant_id, {
      employee_id,
      skill_id,
      verification_status: "VERIFIED",
      verified_by,
      verified_at: new Date(),
    });
  }
}
