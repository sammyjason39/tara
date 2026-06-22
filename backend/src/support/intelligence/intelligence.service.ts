import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { HRService } from "../../core/hr/hr.service";
import { PaginationParams } from "../../shared/pipes/pagination.pipe";

@Injectable()
export class IntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrService: HRService,
  ) {}

  /**
   * Get platform-wide headcount breakdown by company
   */
  async getGlobalHeadcount(pagination: PaginationParams) {
    const skip = (pagination.page - 1) * pagination.pageSize;
    const where = { status: 'active' as const };

    const [companies, totalCount] = await Promise.all([
      this.prisma.companies.findMany({
        where,
        include: {
          _count: {
            select: { employees: { where: { status: "active" } } },
          },
        },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.companies.count({ where }),
    ]);

    const data = companies.map((c: any) => ({
      id: c.id,
      name: c.name,
      activeHeadcount: c._count.employees,
      status: c.status,
    }));

    return {
      data,
      totalCount,
      currentPage: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize),
    };
  }

  /**
   * Get global compensation/payroll spend across all tenants
   */
  async getGlobalCompensationStats(pagination: PaginationParams) {
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [compensations, totalCount] = await Promise.all([
      this.prisma.compensations.findMany({
        select: {
          base_salary: true,
          currency: true,
        },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.compensations.count(),
    ]);

    const total = compensations.reduce((acc: number, curr: any) => acc + Number(curr.base_salary || 0), 0);

    const data = {
      totalMonthlySpend: total,
      employeeCountWithComp: totalCount,
      avgSalary: totalCount > 0 ? total / compensations.length : 0,
      currencies: Array.from(new Set(compensations.map((c: any) => c.currency))),
      compensations,
    };

    return {
      data,
      totalCount,
      currentPage: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize),
    };
  }

  /**
   * Search for employees cross-tenant (Spotlight Search)
   */
  async globalSearch(query: string, pagination: PaginationParams) {
    if (!query || query.length < 2) {
      return {
        data: [],
        totalCount: 0,
        currentPage: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: 0,
      };
    }

    const skip = (pagination.page - 1) * pagination.pageSize;
    const where = {
      OR: [
        { first_name: { contains: query, mode: "insensitive" as const } },
        { last_name: { contains: query, mode: "insensitive" as const } },
        { email: { contains: query, mode: "insensitive" as const } },
        { employee_code: { contains: query, mode: "insensitive" as const } },
      ],
    };

    const [employees, totalCount] = await Promise.all([
      this.prisma.employees.findMany({
        where,
        include: {
          companies: { select: { name: true } },
          departments: { select: { name: true } },
        },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.employees.count({ where }),
    ]);

    const data = employees.map((e: any) => ({
      id: e.id,
      fullName: `${e.first_name} ${e.last_name}`,
      email: e.email,
      code: e.employee_code,
      tenant_id: e.tenant_id,
      company_name: e.companies?.name,
      departments: e.departments?.name || "Unassigned",
      status: e.status,
    }));

    return {
      data,
      totalCount,
      currentPage: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize),
    };
  }

  /**
   * Regional readiness heat-map (Platform-wide)
   */
  async getRegionalReadiness(pagination: PaginationParams) {
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [locations, totalCount] = await Promise.all([
      this.prisma.locations.findMany({
        include: {
          _count: {
            select: { employees: { where: { status: 'active' } } },
          },
          companies: { select: { name: true } },
        },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.locations.count(),
    ]);

    // Group by region/country
    const regions = locations.reduce((acc: any, loc: any) => {
      const region = loc.country || 'Global';
      if (!acc[region]) acc[region] = { staff: 0, cities: [], companies: [] };
      acc[region].staff += loc._count.employees;
      acc[region].cities.push(loc.name);
      acc[region].companies.push(loc.companies?.name);
      return acc;
    }, {});

    return {
      data: {
        totalTrackedRegions: Object.keys(regions).length,
        regions,
      },
      totalCount,
      currentPage: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize),
    };
  }
}
