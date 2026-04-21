import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { UserRole } from "../../shared/roles";
import { PaymentService } from "./payment.service";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("v1/admin/payments")
@UseGuards(TenantInterceptor, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * HUD: Gateway & Provider Health
   * Shows circuit breaker states and failure counts
   */
  @Get("health")
  async getHealth(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      timestamp: new Date().toISOString(),
      providers: this.paymentService.getProviderHealth(),
    };
  }

  /**
   * HUD: Financial Performance Metrics
   * Shows volume, realized fees, and status distributions
   */
  @Get("stats")
  async getStats(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const stats = await this.paymentService.getPaymentStats(tenant_id);
    return {
      success: true,
      tenant_id,
      data: stats,
    };
  }

  /**
   * Manual Reprocess/Sync
   * Forces a status check with the gateway for a specific transaction
   */
  @Post("reprocess/:id")
  async reprocessTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") transactionId: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const actor_id = request.headers["x-actor-id"] as string || "admin-manual";
    
    const result = await this.paymentService.syncTransactionStatus(
      tenant_id,
      transactionId,
      { status: "PENDING" }, // Base check triggers status check
      "MANUAL",
      actor_id
    );

    return {
      success: true,
      transaction_id: transactionId,
      message: "Reprocess triggered",
      data: result,
    };
  }
}
