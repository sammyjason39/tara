import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { SkillsService } from "./skills.service";

@Injectable()
export class CareerPathService {
  private readonly logger = new Logger(CareerPathService.name);

  constructor(
    private readonly repository: IHRRepository,
    private readonly skillsService: SkillsService,
  ) {}

  async suggestNextRoles(tenant_id: string, employee_id: string) {
    this.logger.log(`Suggesting next roles for employee ${employee_id}`);
    
    // 1. Get possible career paths from current position
    const employee = await this.repository.getEmployeeById(tenant_id, employee_id);
    if (!employee || !employee.position_id) return [];

    const allPaths = await this.repository.getCareerPaths(tenant_id);
    const potentialPaths = allPaths.filter(p => p.from_position_id === employee.position_id);

    // 2. For each potential role, calculate readiness
    const suggestions = await Promise.all(potentialPaths.map(async (path) => {
      const readinessAnalysis = await this.predictReadinessIndex(tenant_id, employee_id, path.to_position_id);
      return {
        roleId: path.to_position_id,
        roleName: path.toPosition?.name || "Target Role",
        readinessScore: readinessAnalysis.readinessIndex,
        requirement_notes: path.requirement_notes,
        gaps: readinessAnalysis.gaps,
        recommendations: readinessAnalysis.recommendations,
      };
    }));

    return suggestions.sort((a, b) => b.readinessScore - a.readinessScore);
  }

  async predictReadinessIndex(tenant_id: string, employee_id: string, targetPositionId: string) {
    this.logger.log(`Calculating readiness for ${employee_id} to ${targetPositionId}`);
    
    // 1. Calculate base skill gap
    const gapAnalysis = await this.skillsService.calculateSkillGap(tenant_id, employee_id, targetPositionId);
    
    // 2. Enhance with importance weighting
    // Core skills (level requirement >= 4) get 2x weight
    let weightedScore = 0;
    let totalPossibleWeight = 0;

    gapAnalysis.gaps.forEach(gap => {
      const weight = gap.required >= 4 ? 2 : 1;
      const skillScore = Math.min(gap.actual, gap.required);
      weightedScore += (skillScore / (gap.required || 1)) * weight;
      totalPossibleWeight += weight;
    });

    const readinessIndex = totalPossibleWeight > 0 
      ? Math.round((weightedScore / totalPossibleWeight) * 100) 
      : 100;

    // 3. Generate proactive recommendations
    const recommendations = gapAnalysis.gaps
      .filter(g => g.actual < g.required)
      .map(g => `Increase ${g.skillName} from Level ${g.actual} to ${g.required}`);

    return {
      employee_id,
      targetPositionId,
      readinessIndex,
      gaps: gapAnalysis.gaps,
      recommendations,
    };
  }

  async findMentorMatches(tenant_id: string, employee_id: string) {
    this.logger.log(`Finding mentor matches for employee ${employee_id}`);
    
    const employee = await this.repository.getEmployeeById(tenant_id, employee_id);
    if (!employee) throw new NotFoundException("Employee not found");

    // 1. Identify employee skill gaps
    const skills = await this.repository.getEmployeeSkills(tenant_id, employee_id);
    const gaps = skills.filter(s => s.proficiency < 3); // Skills needing improvement
    
    if (gaps.length === 0) return [];

    // 2. Find employees with high proficiency in those skills
    const gapSkillIds = gaps.map(g => g.skill_id);
    const potentialMentors = await this.repository.findTalentBySkills(tenant_id, gapSkillIds, 4);

    // 3. Filter & Enhance with Location Awareness
    return potentialMentors
      .filter(m => m.employee.id !== employee_id)
      .map(m => {
        const isSameLocation = m.employee.location_id === employee.location_id;
        const isSameTenant = m.employee.tenant_id === employee.tenant_id;
        
        let matchScore = m.matchPercentage;
        if (isSameLocation) matchScore += 10;
        if (isSameTenant) matchScore += 5;

        return {
          mentor: m.employee,
          sharedSkills: m.matchedSkills,
          matchScore: Math.min(100, matchScore),
          contextMatch: isSameLocation ? "LOCAL" : (isSameTenant ? "SAME_TENANT" : "GLOBAL"),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  async createMentorship(tenant_id: string, mentorId: string, menteeId: string, focusSkills: string[]) {
    this.logger.log(`Initiating mentorship: ${mentorId} mentoring ${menteeId}`);
    return this.repository.createMentorshipPair(tenant_id, {
      mentorId,
      menteeId,
      focusSkills,
      status: "ACTIVE",
      start_date: new Date(),
    });
  }
}
