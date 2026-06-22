import { Controller, Get, Query, Req, UseGuards, UseInterceptors, ForbiddenException } from "@nestjs/common";
import { Request } from "express";
import { IntelligenceService } from "./intelligence.service";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { UserRole } from "../../shared/roles";
import { PaginationPipe, PaginationParams } from "../../shared/pipes/pagination.pipe";
import { CacheInterceptor, CacheTTL } from "../../shared/cache";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

/**
 * Explorer Controller
 * Platform-wide intelligence and search
 */
@Controller('intelligence')
@UseInterceptors(TenantInterceptor)
@UseGuards(TenantGuard)
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  private ensureSuperAdmin(role: string) {
    if (role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException("Access Denied: Global Explorer is restricted to Superadmins only.");
    }
  }

  @Get("workforce/headcount")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  async getGlobalHeadcount(
    @Req() request: RequestWithTenant,
    @Query(PaginationPipe) pagination: PaginationParams,
  ) {
    this.ensureSuperAdmin(request.tenantContext.role || "");
    return this.intelligenceService.getGlobalHeadcount(pagination);
  }

  @Get("workforce/compensation")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  async getGlobalCompensation(
    @Req() request: RequestWithTenant,
    @Query(PaginationPipe) pagination: PaginationParams,
  ) {
    this.ensureSuperAdmin(request.tenantContext.role || "");
    return this.intelligenceService.getGlobalCompensationStats(pagination);
  }

  @Get("search")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  async globalSearch(
    @Req() request: RequestWithTenant,
    @Query("q") query: string,
    @Query(PaginationPipe) pagination: PaginationParams,
  ) {
    this.ensureSuperAdmin(request.tenantContext.role || "");
    return this.intelligenceService.globalSearch(query, pagination);
  }

  @Get("workforce/readiness")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  async getRegionalReadiness(
    @Req() request: RequestWithTenant,
    @Query(PaginationPipe) pagination: PaginationParams,
  ) {
    this.ensureSuperAdmin(request.tenantContext.role || "");
    return this.intelligenceService.getRegionalReadiness(pagination);
  }
}
