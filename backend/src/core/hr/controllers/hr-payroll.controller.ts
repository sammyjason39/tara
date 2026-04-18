import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Query, 
  Param, 
  UseGuards, 
  Headers,
  Req 
} from "@nestjs/common";
import { HrPayrollService } from "../hr-payroll.service";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { TenantGuard } from "../../../shared/guards/tenant.guard";
import { UserRole } from "../../../shared/roles";
import { Prisma } from "@prisma/client";

@Controller("api/hr/payroll")
@UseGuards(RolesGuard, TenantGuard)
export class HrPayrollController {
  constructor(private readonly payrollService: HrPayrollService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getPayroll(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("location_id") location_id?: string,
    @Query("employee_id") employee_id?: string,
    @Query("period") period?: string,
  ) {
    return this.payrollService.getPayroll(tenant_id, location_id, employee_id, period);
  }

  @Post("calculate/:employee_id")
  @Roles(UserRole.ADMIN)
  async calculatePayroll(
    @Headers("x-tenant-id") tenant_id: string,
    @Param("employee_id") employee_id: string,
    @Body("period") period: string,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.payrollService.calculatePayroll(tenant_id, employee_id, period, user_id);
  }

  @Get("compensation/:employee_id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getCompensation(
    @Headers("x-tenant-id") tenant_id: string,
    @Param("employee_id") employee_id: string,
  ) {
    return this.payrollService.getCompensation(tenant_id, employee_id);
  }

  @Put("compensation/:employee_id")
  @Roles(UserRole.ADMIN)
  async updateCompensation(
    @Headers("x-tenant-id") tenant_id: string,
    @Param("id") employee_id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.payrollService.updateCompensation(tenant_id, employee_id, data, user_id);
  }

  @Get("analytics")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getCompensationAnalytics(@Headers("x-tenant-id") tenant_id: string) {
    return this.payrollService.getCompensationAnalytics(tenant_id);
  }
}
