import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { BranchGatingGuard } from "../auth/guards/branch-gating.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
import { CreateProvisioningRequestDto } from "./dto/create-provisioning-request.dto";
import { ITService } from "./it.service";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("it")
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard)
@RequiredModule("it")
export class ITController {
  constructor(private readonly itService: ITService) {}

  @Get("provisioning")
  async getProvisioningRequests(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.itService.getProvisioningRequests(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("provisioning")
  async createProvisioningRequest(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateProvisioningRequestDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Provisioning request created",
      data: await this.itService.createProvisioningRequest(tenantId, dto),
    };
  }

  @Put("provisioning/:id/provision")
  async markProvisioned(
    @Req() request: RequestWithTenant,
    @Param("id") requestId: string,
    @Body() body: { provisionedBy: string },
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Provisioning request marked as provisioned",
      data: await this.itService.markProvisioned(
        tenantId,
        requestId,
        body.provisionedBy || "system",
      ),
    };
  }

  @Put("provisioning/:id")
  async updateProvisioningRequest(
    @Req() request: RequestWithTenant,
    @Param("id") requestId: string,
    @Body() dto: Partial<CreateProvisioningRequestDto>,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Provisioning request updated",
      data: await this.itService.updateProvisioningRequest(
        tenantId,
        requestId,
        dto,
      ),
    };
  }

  @Delete("provisioning/:id")
  async deleteProvisioningRequest(
    @Req() request: RequestWithTenant,
    @Param("id") requestId: string,
  ) {
    const { tenantId } = request.tenantContext;
    await this.itService.deleteProvisioningRequest(tenantId, requestId);
    return {
      success: true,
      tenantId,
      message: "Provisioning request deleted",
    };
  }

  @Get("system-health")
  async getSystemHealth(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.itService.getSystemHealth(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }
}
