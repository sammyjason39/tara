import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ArCustomerService } from './services/ar-customer.service';
import { ArInvoiceService } from './services/ar-invoice.service';
import { ArPaymentService } from './services/ar-payment.service';
import { ArCreditMemoService } from './services/ar-credit-memo.service';
import { ArAgingReportService } from './services/ar-aging-report.service';
import { CreateCustomerDto, CreateInvoiceDto, CreatePaymentDto, AllocatePaymentDto } from './dto/ar.dto';
import { TenantGuard } from '../../../shared/guards/tenant.guard';
import { UserRole } from '../../../shared/roles';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { TenantCtx } from '../../../gateway/tenant-context.decorator';
import { TenantContext } from '../../../gateway/tenant-context.interface';

@Controller('v1/finance/ar')
@UseGuards(TenantGuard)
export class ArController {
  constructor(
    private readonly customerService: ArCustomerService,
    private readonly invoiceService: ArInvoiceService,
    private readonly paymentService: ArPaymentService,
    private readonly creditMemoService: ArCreditMemoService,
    private readonly agingService: ArAgingReportService,
  ) {}

  @Get('customers')
  async listCustomers(@TenantCtx() ctx: TenantContext) {
    return this.customerService.listCustomers(ctx.tenant_id, ctx.company_id);
  }

  @Post('customers')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async createCustomer(@TenantCtx() ctx: TenantContext, @Body() dto: CreateCustomerDto) {
    return this.customerService.createCustomer(ctx.tenant_id, ctx.company_id, dto);
  }

  @Get('invoices')
  async listInvoices(@TenantCtx() ctx: TenantContext, @Query('customer_id') customer_id?: string) {
    return this.invoiceService.listInvoices(ctx.tenant_id, ctx.company_id, customer_id);
  }

  @Post('invoices')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async createInvoice(@TenantCtx() ctx: TenantContext, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.createInvoice(ctx.tenant_id, ctx.company_id, dto);
  }

  @Post('invoices/:id/issue')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async issueInvoice(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.invoiceService.issueInvoice(ctx.tenant_id, ctx.company_id, id);
  }

  @Post('invoices/:id/void')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async voidInvoice(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.invoiceService.voidInvoice(ctx.tenant_id, ctx.company_id, id);
  }

  @Post('payments')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async receivePayment(@TenantCtx() ctx: TenantContext, @Body() dto: CreatePaymentDto) {
    return this.paymentService.receivePayment(ctx.tenant_id, ctx.company_id, dto);
  }

  @Post('payments/allocate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async allocatePayment(@TenantCtx() ctx: TenantContext, @Body() dto: AllocatePaymentDto) {
    return this.paymentService.allocatePayment(ctx.tenant_id, ctx.company_id, dto);
  }

  @Post('payments/:id/refund')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async refundPayment(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body('amount') amount: number) {
    return this.paymentService.refundPayment(ctx.tenant_id, ctx.company_id, id, amount);
  }

  @Post('credit-memos')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async issueCreditMemo(@TenantCtx() ctx: TenantContext, @Body() data: any) {
    return this.creditMemoService.issueCreditMemo(ctx.tenant_id, ctx.company_id, data);
  }

  @Get('reports/aging')
  async getAgingReport(@TenantCtx() ctx: TenantContext) {
    return this.agingService.getAgingReport(ctx.tenant_id, ctx.company_id);
  }
}
