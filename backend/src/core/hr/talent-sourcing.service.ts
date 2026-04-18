import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { IngestTalentLeadDto } from "./dto/ingest-talent-lead.dto";

@Injectable()
export class TalentSourcingService {
  private readonly logger = new Logger(TalentSourcingService.name);

  constructor(private readonly repository: IHRRepository) {}

  async ingestLead(tenant_id: string, dto: IngestTalentLeadDto) {
    this.logger.log(`Ingesting talent lead: ${dto.name} from ${dto.source || "LINKEDIN"}`);

    // AI Lead Scoring Logic
    const leadScore = await this.calculateLeadScore(tenant_id, dto);

    return this.repository.createTalentLead(tenant_id, {
      ...dto,
      leadScore,
      status: "LEAD",
    });
  }

  async convertToCandidate(tenant_id: string, lead_id: string, requisitionId: string) {
    this.logger.log(`Converting lead ${lead_id} to candidate for requisition ${requisitionId}`);
    
    const lead = await this.repository.getTalentLeadById(tenant_id, lead_id);
    if (!lead) throw new NotFoundException("Talent lead not found");

    // 1. Create candidate record
    const candidate = await this.repository.createCandidate(tenant_id, {
      first_name: lead.name.split(' ')[0],
      last_name: lead.name.split(' ').slice(1).join(' ') || lead.name,
      email: lead.email,
      phone: lead.phone,
      requisitionId,
      source: lead.source,
      status: "lead_converted",
      metadata: {
        lead_id: lead.id,
        originalLeadScore: lead.leadScore,
        headline: lead.headline,
      }
    });

    // 2. Update lead status
    await this.repository.updateTalentLead(tenant_id, lead_id, {
      status: "CONVERTED",
      metadata: {
        ...((lead as any).metadata || {}),
        convertedAt: new Date(),
        candidateId: candidate.id,
      }
    });

    return candidate;
  }

  private async calculateLeadScore(tenant_id: string, dto: IngestTalentLeadDto): Promise<number> {
    let score = 50; // Base score

    // 1. Headline Keywords (+/-) - Hierarchical weighting
    const keywords = {
      'architect': 25,
      'staff': 20,
      'principal': 20,
      'lead': 15,
      'senior': 10,
      'expert': 10,
      'specialist': 5,
      'junior': -10,
      'intern': -20,
    };

    const headline = (dto.headline || "").toLowerCase();
    Object.entries(keywords).forEach(([kw, weight]) => {
      if (headline.includes(kw)) score += weight;
    });

    // 2. Skill Matching (Proactive Ontology Check)
    if (dto.skills && dto.skills.length > 0) {
      // Check if skills match existing high-demand skills in the tenant
      const knownSkills = await this.repository.getSkills(tenant_id);
      const knownSkillNames = knownSkills.map(s => s.name.toLowerCase());
      
      let matchedSkillsCount = 0;
      dto.skills.forEach(s => {
        if (knownSkillNames.includes(s.toLowerCase())) matchedSkillsCount++;
      });

      score += (matchedSkillsCount * 10); // Reward matches to known ontology
      score += Math.min(dto.skills.length * 2, 20); // Reward breadth
    }

    // 3. Source & Completeness
    if (dto.source === "LINKEDIN") score += 5;
    if (dto.email) score += 5;
    if (dto.phone) score += 5;

    return Math.min(100, Math.max(0, score));
  }
}
