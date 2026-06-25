import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  Logger,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WhatsAppVerificationService } from '../services/whatsapp-verification.service';
import { WhatsAppAuditService } from '../services/whatsapp-audit.service';
import { WhatsAppSessionService } from '../services/whatsapp-session.service';
import { WhatsAppClientService } from '../services/whatsapp-client.service';

/**
 * WhatsApp Settings Controller
 *
 * Self-service endpoints for employees to manage their WhatsApp integration:
 * - GET    /v1/me/whatsapp          — Get current WhatsApp status
 * - PUT    /v1/me/whatsapp          — Set/update WhatsApp number (triggers OTP)
 * - POST   /v1/me/whatsapp/verify   — Confirm OTP code
 * - DELETE /v1/me/whatsapp          — Revoke WhatsApp opt-in
 * - GET    /v1/me/whatsapp/history  — View own message history
 *
 * Admin endpoints:
 * - GET    /v1/admin/whatsapp/status          — Overview of all employees' WA status
 * - GET    /v1/admin/whatsapp/employees/:id   — Get specific employee WA details
 * - GET    /v1/admin/whatsapp/health          — Service health check
 */
@Controller()
export class WhatsAppSettingsController {
  private readonly logger = new Logger(WhatsAppSettingsController.name);

  constructor(
    private readonly verificationService: WhatsAppVerificationService,
    private readonly auditService: WhatsAppAuditService,
    private readonly sessionService: WhatsAppSessionService,
    private readonly clientService: WhatsAppClientService,
  ) {}

  // ==========================================================================
  // Self-service endpoints (employee manages their own WhatsApp)
  // ==========================================================================

  /**
   * Get current WhatsApp status for the authenticated employee.
   */
  @Get('me/whatsapp')
  async getMyWhatsAppStatus(@Req() req: any) {
    const employeeId = this.getEmployeeId(req);
    const status = await this.verificationService.getStatus(employeeId);
    const stats = await this.auditService.getEmployeeStats(employeeId);

    return {
      ...status,
      stats,
      service_available: this.clientService.isAvailable(),
    };
  }

  /**
   * Set or update WhatsApp number — triggers OTP verification.
   */
  @Put('me/whatsapp')
  async setWhatsAppNumber(
    @Req() req: any,
    @Body() body: { whatsapp_number: string },
  ) {
    const employeeId = this.getEmployeeId(req);

    if (!body.whatsapp_number) {
      throw new BadRequestException('whatsapp_number is required');
    }

    const result = await this.verificationService.initiateVerification(
      employeeId,
      body.whatsapp_number,
    );

    return result;
  }

  /**
   * Confirm OTP code to verify WhatsApp number.
   */
  @Post('me/whatsapp/verify')
  @HttpCode(200)
  async confirmVerification(
    @Req() req: any,
    @Body() body: { code: string },
  ) {
    const employeeId = this.getEmployeeId(req);

    if (!body.code || body.code.length !== 6) {
      throw new BadRequestException('Kode verifikasi harus 6 digit');
    }

    return this.verificationService.confirmVerification(employeeId, body.code);
  }

  /**
   * Revoke WhatsApp opt-in (disconnect).
   */
  @Delete('me/whatsapp')
  @HttpCode(200)
  async revokeWhatsApp(@Req() req: any) {
    const employeeId = this.getEmployeeId(req);
    await this.verificationService.revokeWhatsApp(employeeId);
    return { success: true, message: 'WhatsApp berhasil diputuskan' };
  }

  /**
   * View own message history.
   */
  @Get('me/whatsapp/history')
  async getMyHistory(
    @Req() req: any,
  ) {
    const employeeId = this.getEmployeeId(req);
    const messages = await this.auditService.getMessageHistory(employeeId, { limit: 50 });
    const sessions = await this.sessionService.getSessionHistory(employeeId, 10);

    return { messages, sessions };
  }

  // ==========================================================================
  // Admin endpoints
  // ==========================================================================

  /**
   * Get WhatsApp status overview for all employees (admin).
   */
  @Get('admin/whatsapp/status')
  async getWhatsAppOverview(@Req() req: any) {
    // TODO: Add admin role guard
    const { PrismaService } = await import('../../../../persistence/prisma.service');
    // Using inline prisma access for admin queries
    const prisma = (this.verificationService as any).prisma;

    const stats = await prisma.employee.groupBy({
      by: ['whatsapp_opted_in', 'whatsapp_verified'],
      where: { employment_status: 'active' },
      _count: true,
    });

    const totalActive = await prisma.employee.count({
      where: { employment_status: 'active' },
    });

    const optedIn = await prisma.employee.count({
      where: { employment_status: 'active', whatsapp_opted_in: true },
    });

    const verified = await prisma.employee.count({
      where: { employment_status: 'active', whatsapp_verified: true },
    });

    return {
      total_active_employees: totalActive,
      whatsapp_opted_in: optedIn,
      whatsapp_verified: verified,
      not_configured: totalActive - optedIn,
      breakdown: stats,
    };
  }

  /**
   * Get specific employee WhatsApp details (admin).
   */
  @Get('admin/whatsapp/employees/:id')
  async getEmployeeWhatsApp(@Param('id') employeeId: string) {
    const status = await this.verificationService.getStatus(employeeId);
    const stats = await this.auditService.getEmployeeStats(employeeId);
    const recentMessages = await this.auditService.getMessageHistory(employeeId, { limit: 20 });

    return { ...status, stats, recent_messages: recentMessages };
  }

  /**
   * Service health check (admin).
   */
  @Get('admin/whatsapp/health')
  async getHealthStatus() {
    return {
      kapso_configured: this.clientService.isAvailable(),
      phone_number_id: this.clientService.getPhoneNumberId(),
      status: this.clientService.isAvailable() ? 'healthy' : 'disconnected',
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private getEmployeeId(req: any): string {
    // Extract from JWT payload (set by auth middleware)
    const employeeId = req.user?.employee_id || req.user?.sub || req.user?.id;
    if (!employeeId) {
      throw new BadRequestException('Authentication required');
    }
    return employeeId;
  }
}
