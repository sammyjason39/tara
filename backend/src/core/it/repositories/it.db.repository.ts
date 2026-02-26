import { Injectable, NotFoundException } from "@nestjs/common";
import { ITProvisioningRequest, ITSystemHealth } from "@prisma/client";
import { PrismaService } from "../../../persistence/prisma.service";
import { CreateProvisioningRequestDto } from "../dto/create-provisioning-request.dto";
import { ProvisioningRequest } from "../entities/provisioning-request.entity";
import { SystemHealth } from "../entities/system-health.entity";
import { IITRepository } from "./it.repository.interface";

@Injectable()
export class ITDbRepository extends IITRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getProvisioningRequests(
    tenantId: string,
  ): Promise<ProvisioningRequest[]> {
    const requests = await this.prisma.iTProvisioningRequest.findMany({
      where: { tenantId: tenantId },
    });

    return requests.map((r: ITProvisioningRequest) => ({
      id: r.id,
      tenantId: r.tenantId,
      employeeId: r.employeeId || undefined,
      supplierId: r.supplierId || undefined,
      supplierBranchId: r.supplierBranchId || undefined,
      scope: (r.scope as any) || "full_portal",
      reason: r.reason || "",
      status: r.status.toLowerCase() as any,
      requestedBy: r.requestedBy,
      provisionedBy: r.provisionedBy || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async createProvisioningRequest(
    tenantId: string,
    dto: CreateProvisioningRequestDto,
  ): Promise<ProvisioningRequest> {
    let finalEmployeeId = dto.employeeId;
    let fallbackReason = dto.reason || "";

    if (finalEmployeeId && finalEmployeeId.startsWith("EMP-")) {
      const emp = await this.prisma.employee.findUnique({
        where: {
          tenantId_employeeCode: { tenantId, employeeCode: finalEmployeeId },
        },
      });
      if (emp) {
        finalEmployeeId = emp.id;
      } else {
        // Graceful fallback for brand-new accounts where the Employee record isn't in DB yet
        fallbackReason = `[RequestedFor: ${finalEmployeeId}] ` + fallbackReason;
        finalEmployeeId = undefined as any;
      }
    }

    let finalSupplierId = dto.supplierId;
    if (finalSupplierId && finalSupplierId.startsWith("SUP-")) {
      const sup = await this.prisma.supplierMaster.findFirst({
        where: { tenantId, id: { startsWith: finalSupplierId } }, // Mock loose match
      });
      if (!sup)
        throw new NotFoundException(`Supplier ${finalSupplierId} not found`);
      finalSupplierId = sup.id;
    }

    const created = await this.prisma.iTProvisioningRequest.create({
      data: {
        tenantId: tenantId,
        employeeId: finalEmployeeId,
        supplierId: finalSupplierId,
        supplierBranchId: dto.supplierBranchId,
        scope: dto.scope,
        reason: fallbackReason,
        status: "REQUESTED",
        requestedBy: "system", // In real app, this would be from auth
      },
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      employeeId: created.employeeId || undefined,
      supplierId: created.supplierId || undefined,
      supplierBranchId: created.supplierBranchId || undefined,
      scope: (created.scope as any) || "full_portal",
      reason: created.reason || "",
      status: "requested",
      requestedBy: created.requestedBy,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async markProvisioned(
    tenantId: string,
    requestId: string,
    provisionedBy: string,
  ): Promise<ProvisioningRequest> {
    const updated = await this.prisma.iTProvisioningRequest.update({
      where: { id: requestId, tenantId: tenantId },
      data: {
        status: "PROVISIONED",
        provisionedBy,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      employeeId: updated.employeeId || undefined,
      supplierId: updated.supplierId || undefined,
      supplierBranchId: updated.supplierBranchId || undefined,
      scope: (updated.scope as any) || "full_portal",
      reason: updated.reason || "",
      status: "provisioned",
      requestedBy: updated.requestedBy,
      provisionedBy: updated.provisionedBy || undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async updateProvisioningRequest(
    tenantId: string,
    requestId: string,
    dto: Partial<CreateProvisioningRequestDto>,
  ): Promise<ProvisioningRequest> {
    let finalEmployeeId = dto.employeeId;
    let fallbackReason = dto.reason;

    if (finalEmployeeId && finalEmployeeId.startsWith("EMP-")) {
      const emp = await this.prisma.employee.findUnique({
        where: {
          tenantId_employeeCode: { tenantId, employeeCode: finalEmployeeId },
        },
      });
      if (emp) {
        finalEmployeeId = emp.id;
      } else {
        // Fallback for non-existent employees in update
        fallbackReason =
          `[RequestedFor: ${finalEmployeeId}] ` + (fallbackReason || "");
        finalEmployeeId = undefined as any;
      }
    }

    // Determine final data
    const updateData: any = { ...dto };
    if (finalEmployeeId !== dto.employeeId) {
      updateData.employeeId = finalEmployeeId;
      updateData.reason = fallbackReason;
    }

    const updated = await this.prisma.iTProvisioningRequest.update({
      where: { id: requestId, tenantId: tenantId },
      data: updateData,
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      employeeId: updated.employeeId || undefined,
      supplierId: updated.supplierId || undefined,
      supplierBranchId: updated.supplierBranchId || undefined,
      scope: (updated.scope as any) || "full_portal",
      reason: updated.reason || "",
      status: updated.status.toLowerCase() as any,
      requestedBy: updated.requestedBy,
      provisionedBy: updated.provisionedBy || undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteProvisioningRequest(
    tenantId: string,
    requestId: string,
  ): Promise<void> {
    await this.prisma.iTProvisioningRequest.delete({
      where: { id: requestId, tenantId: tenantId },
    });
  }

  async getSystemHealth(tenantId: string): Promise<SystemHealth[]> {
    const health = await this.prisma.iTSystemHealth.findMany({
      where: { tenantId: tenantId },
      orderBy: { checkedAt: "desc" },
      take: 20,
    });

    return health.map((h: ITSystemHealth) => ({
      id: h.id,
      tenantId: h.tenantId,
      component: h.component as any,
      status: h.status.toLowerCase() as any,
      latencyMs: h.latencyMs,
      checkedAt: h.checkedAt,
    }));
  }
}
