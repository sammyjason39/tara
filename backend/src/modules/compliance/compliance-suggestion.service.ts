import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

export interface ComplianceSuggestion {
  country: string;
  message: string;
  modules: string[];
  requiresApproval: boolean;
}

@Injectable()
export class ComplianceSuggestionService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSuggestions(tenant_id: string): Promise<ComplianceSuggestion[]> {
    const company = await this.prisma.companies.findUnique({ where: { id: tenant_id } });
    if (!company) return [];

    const suggestions: ComplianceSuggestion[] = [];

    if (company.country === 'ID') {
      suggestions.push({
        country: 'ID',
        message: 'Company is registered in Indonesia. Enable BPJS Kesehatan, BPJS Ketenagakerjaan, and PPh21 compliance?',
        modules: ['BPJS_KESEHATAN', 'BPJS_KETENAGAKERJAAN', 'PPH21'],
        requiresApproval: true,
      });
    }

    if (company.country === 'SG') {
      suggestions.push({
        country: 'SG',
        message: 'Company is registered in Singapore. Enable CPF contributions?',
        modules: ['CPF'],
        requiresApproval: true,
      });
    }

    if (company.country === 'AE') {
      suggestions.push({
        country: 'AE',
        message: 'Company is registered in UAE. Enable WPS salary validation?',
        modules: ['WPS'],
        requiresApproval: true,
      });
    }

    return suggestions;
  }
}
