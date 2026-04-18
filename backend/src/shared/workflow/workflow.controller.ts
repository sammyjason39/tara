import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { TenantGuard } from "../guards/tenant.guard";
import { Request } from "express";
import { TenantContext } from "../../gateway/tenant-context.interface";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("zenvix-workflow")
// @UseInterceptors(TenantInterceptor)
// @UseGuards(TenantGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {
    console.log("WorkflowController initialized with path: zenvix-workflow");
  }

  @Get("test-routing")
  test() {
    console.log("Workflow test-routing hit!");
    return { status: "ok", message: "Workflow routing is working" };
  }

  @Get("list")
  async listRequests(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    return this.workflowService.listAll(tenant_id);
  }

  @Post("request")
  async createRequest(
    @Req() request: RequestWithTenant,
    @Body()
    body: {
      entity_type: string;
      entity_id: string;
      maker_dept: string;
      destination_dept: string;
      notes?: string;
      metadata?: any;
    },
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return this.workflowService.createRequest({
      tenant_id,
      ...body,
      requested_by: user_id || "system",
    });
  }

  @Get("inbox")
  async getInbox(
    @Req() request: RequestWithTenant,
    @Query("dept") dept: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.workflowService.listInbox(tenant_id, dept);
  }

  @Post(":id/approve")
  async approveRequest(
    @Param("id") id: string,
    @Req() request: RequestWithTenant,
    @Body("notes") notes?: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return this.workflowService.approveRequest(tenant_id, id, user_id || "system", notes);
  }

  @Post(":id/reject")
  async rejectRequest(
    @Param("id") id: string,
    @Req() request: RequestWithTenant,
    @Body("notes") notes?: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return this.workflowService.rejectRequest(tenant_id, id, user_id || "system", notes);
  }
}
