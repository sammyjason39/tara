import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(private readonly repository: IHRRepository) {}

  async recommendLearningPath(tenant_id: string, employee_id: string) {
    this.logger.log(`Generating learning recommendations for ${employee_id}`);

    // 1. Get current skill levels
    const employeeSkills = await this.repository.getEmployeeSkills(tenant_id, employee_id);
    
    // 2. Identify gaps (based on current position or intended career path)
    const employee = await this.repository.getEmployeeById(tenant_id, employee_id);
    if (!employee) throw new NotFoundException(`Employee ${employee_id} not found`);
    
    // Attempt to find position metadata for current role_title
    const positions = await this.repository.getPositions(tenant_id);
    const targetPosition = positions.find(p => p.title === employee.role_title);
    
    const gaps: any[] = [];
    if (targetPosition) {
      const positionSkills = await this.repository.getPositionSkills(tenant_id, targetPosition.id);
      for (const ps of positionSkills) {
        const current = employeeSkills.find(es => es.skill_id === ps.skill_id);
        if (!current || current.proficiency < ps.minProficiency) {
          gaps.push({
            skill_id: ps.skill_id,
            skillName: (ps as any).skill?.name || "Required Skill",
            gap: ps.minProficiency - (current?.proficiency || 0),
            isMandatory: ps.isMandatory
          });
        }
      }
    }

    // 3. Find programs that address these gaps
    const gapSkillIds = gaps.map(g => g.skill_id);
    if (gapSkillIds.length === 0) return [];

    const programs = await this.repository.getTrainingProgramsBySkills(tenant_id, gapSkillIds);

    const recommendations = programs.map(p => {
      const addressedGaps = (p as any).skills?.filter((ps: any) => gapSkillIds.includes(ps.skill_id)) || [];
      return {
        programId: p.id,
        programName: p.name,
        addressedSkills: addressedGaps.map((ag: any) => ag.skill?.name),
        totalProficiencyGain: addressedGaps.reduce((sum: number, ag: any) => sum + ag.proficiencyGain, 0),
        priority: addressedGaps.some((ag: any) => gaps.find((g: any) => g.skill_id === ag.skill_id)?.isMandatory) ? 'HIGH' : 'MEDIUM'
      };
    });

    return recommendations.sort((a, b) => (a.priority === 'HIGH' ? -1 : 1));
  }

  async calculateLearningROI(tenant_id: string, employee_id: string) {
    this.logger.log(`Calculating learning ROI for ${employee_id}`);
    
    const employee = await this.repository.getEmployeeById(tenant_id, employee_id);
    if (!employee) throw new NotFoundException(`Employee ${employee_id} not found`);

    const history = await this.repository.getEmployeeTrainingHistory(tenant_id, employee_id);
    const completed = history.filter(h => h.status === 'completed');
    
    // Granular ROI Calculation
    const totalGains = completed.reduce((sum: number, h: any) => {
      return sum + (h.program?.skills?.reduce((s: number, sk: any) => s + sk.proficiencyGain, 0) || 0);
    }, 0);

    const skillAdvancementIndex = completed.length > 0 ? (totalGains / completed.length).toFixed(2) : '0.00';
    
    // Mock performance rating correlation
    const performanceHistory = await this.repository.getEmployeePerformanceHistory(tenant_id, employee_id);
    const averageRating = performanceHistory.length > 0 
      ? performanceHistory.reduce((sum, r) => sum + (r.rating || 3), 0) / performanceHistory.length 
      : 3.0;

    return {
      employee_id,
      programsCompleted: completed.length,
      totalProficiencyGained: totalGains,
      skillAdvancementIndex: Number(skillAdvancementIndex),
      currentPerformanceRating: averageRating,
      impactOnPerformance: completed.length > 3 ? 'CRITICAL_GROWTH' : (completed.length > 0 ? 'POSITIVE' : 'NEUTRAL'),
      roiPercentage: completed.length > 0 ? (totalGains * 1.5).toFixed(1) : '0.0', // Mocked ROI multiplier
      summary: `Employee has completed ${completed.length} courses, achieving a competency gain of ${totalGains} units.`
    };
  }

  async autoEnrollInGapFillers(tenant_id: string, employee_id: string) {
    this.logger.log(`Running auto-enrollment for ${employee_id}`);
    
    const recommendations = await this.recommendLearningPath(tenant_id, employee_id);
    const highPriority = recommendations.filter(r => r.priority === 'HIGH');
    
    const existingHistory = await this.repository.getEmployeeTrainingHistory(tenant_id, employee_id);
    const activeProgramIds = existingHistory.filter(h => ['in_progress', 'pending'].includes(h.status)).map(h => h.programId);

    const enrolled = [];
    for (const rec of highPriority) {
      if (!activeProgramIds.includes(rec.programId)) {
        const assignment = await this.repository.enrollInTrainingProgram(tenant_id, employee_id, rec.programId);
        enrolled.push(assignment);
      }
    }

    return enrolled;
  }
}
