import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { HRService } from "../../core/hr/hr.service";

@Injectable()
export class ExplorerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrService: HRService,
  ) {}

  /**
   * Get platform-wide headcount breakdown by company
   */
  async getGlobalHeadcount(): Promise<any[]> {
    const companies = await this.prisma.company.findMany({
      include: {
        _count: {
          select: { employees: { where: { status: "active" } } },
        },
      },
      where: { status: 'active' }
    });

    return companies.map((c: any) => ({
      id: c.id,
      name: c.name,
      activeHeadcount: c._count.employees,
      status: c.status,
    }));
  }

  /**
   * Get global compensation/payroll spend across all tenants
   */
  async getGlobalCompensationStats(): Promise<any> {
    const compensations = await this.prisma.compensation.findMany({
      select: {
        baseSalary: true,
        currency: true,
      },
    });

    if (compensations.length === 0) return { totalMonthlySpend: 0, count: 0 };

    const total = compensations.reduce((acc: any, curr: any) => acc + Number(curr.baseSalary), 0);
    
    return {
      totalMonthlySpend: total,
      employeeCountWithComp: compensations.length,
      avgSalary: compensations.length > 0 ? total / compensations.length : 0,
      currencies: Array.from(new Set(compensations.map((c: any) => c.currency))),
    };
  }

  /**
   * Search for employees cross-tenant (Spotlight Search)
   */
  async globalSearch(query: string): Promise<any[]> {
    if (!query || query.length < 2) return [];

    const employees = await this.prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { employeeCode: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        company: { select: { name: true } },
        department: { select: { name: true } },
      },
      take: 20,
    });

    return employees.map((e: any) => ({
      id: e.id,
      fullName: `${e.firstName} ${e.lastName}`,
      email: e.email,
      code: e.employeeCode,
      tenantId: e.tenantId,
      companyName: e.company.name,
      department: e.department?.name || "Unassigned",
      status: e.status
    }));
  }

  /**
   * Regional readiness heat-map (Platform-wide)
   */
  async getRegionalReadiness(): Promise<any> {
    const locations = await this.prisma.location.findMany({
      include: {
        _count: {
          select: { employees: { where: { status: 'active' } } }
        },
        company: { select: { name: true } }
      }
    });

    // Group by region/country (simulated)
    const regions = locations.reduce((acc: any, loc: any) => {
      const region = loc.country || 'Global';
      if (!acc[region]) acc[region] = { staff: 0, cities: [], companies: [] };
      acc[region].staff += loc._count.employees;
      acc[region].cities.push(loc.name);
      acc[region].companies.push(loc.company.name);
      return acc;
    }, {});

    return {
      totalTrackedRegions: Object.keys(regions).length,
      data: regions
    };
  }
}
