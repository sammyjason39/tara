import { Controller, Get, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ComplianceService } from "../compliance.service";
import { HRService } from "../hr.service";
import { ContractType } from "../contract-generator.service";
import { Request, Response } from "express";
import { Res } from "@nestjs/common";
import { TenantContext } from "../../../gateway/tenant-context.interface";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { UserRole } from "../../../shared/roles";
import { RolesGuard } from "../../../shared/guards/roles.guard";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("v1/hr/compliance")
@UseGuards(RolesGuard)
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly hrService: HRService,
  ) {}

  /**
   * POST /v1/hr/compliance/scan-expiries
   * Triggers a global check for document expirations and fires alerts.
   */
  @Post("scan-expiries")
  @Roles(UserRole.SUPERADMIN, UserRole.OWNER, UserRole.ADMIN)
  async scanExpiries(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const count = await this.complianceService.checkExpirations(tenant_id);
    return { 
      success: true, 
      tenant_id, 
      data: { processed: count, message: `Scan complete. ${count} expiration events processed.` } 
    };
  }

  /**
   * GET /v1/hr/compliance/audit-report
   * Provides a summary of tenant compliance health.
   */
  @Get("audit-report")
  @Roles(UserRole.SUPERADMIN, UserRole.OWNER, UserRole.ADMIN)
  async getAuditReport(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const report = await this.complianceService.auditCompliance(tenant_id);
    return { success: true, tenant_id, data: report };
  }

  /**
   * POST /v1/hr/compliance/contracts/generate
   * Generates a PDF contract and returns it as a download.
   */
  @Post("contracts/generate")
  @Roles(UserRole.SUPERADMIN, UserRole.OWNER, UserRole.ADMIN)
  async generateContract(
    @Req() request: RequestWithTenant,
    @Body() body: { type: ContractType; data: any },
    @Res() res: Response,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    
    try {
      const buffer = await this.hrService.generateContractPDF(
        tenant_id, 
        body.type, 
        body.data, 
        user_id || "system"
      );

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=contract_${Date.now()}.pdf`,
        "Content-Length": buffer.length,
      });

      res.end(buffer);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to generate contract PDF." });
    }
  }
}
