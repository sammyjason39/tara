import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma.service';
import { EventBusService } from '../../services/event-bus.service';
import { WhatsAppClientService } from './whatsapp-client.service';
import { WhatsAppAuditService } from './whatsapp-audit.service';

interface PendingVerification {
  employeeId: string;
  phone: string;
  code: string;
  expiresAt: Date;
  attempts: number;
}

/**
 * WhatsApp Verification Service — OTP-based phone number verification.
 *
 * Flow:
 * 1. Employee submits their WhatsApp number
 * 2. System sends a 6-digit OTP via WhatsApp
 * 3. Employee enters OTP in the app
 * 4. If valid → whatsapp_verified = true
 *
 * Security:
 * - OTP expires after 5 minutes
 * - Max 3 attempts per OTP
 * - Max 5 OTP requests per day per employee
 * - OTP stored in-memory (not DB) for security
 */
@Injectable()
export class WhatsAppVerificationService {
  private readonly logger = new Logger(WhatsAppVerificationService.name);
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 3;
  private readonly MAX_DAILY_REQUESTS = 5;

  // In-memory OTP store (TTL-based, not persisted)
  private pendingVerifications = new Map<string, PendingVerification>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientService: WhatsAppClientService,
    private readonly auditService: WhatsAppAuditService,
    private readonly eventBusService: EventBusService,
  ) {}

  /**
   * Initiate verification: save WhatsApp number and send OTP.
   */
  async initiateVerification(
    employeeId: string,
    whatsappNumber: string,
  ): Promise<{ success: boolean; message: string }> {
    // Validate phone format (international: starts with country code)
    const normalized = this.normalizePhone(whatsappNumber);
    if (!this.isValidPhone(normalized)) {
      throw new BadRequestException(
        'Format nomor tidak valid. Gunakan format internasional (contoh: +6281234567890)',
      );
    }

    // Check daily request limit
    const dailyCount = await this.getDailyRequestCount(employeeId);
    if (dailyCount >= this.MAX_DAILY_REQUESTS) {
      throw new BadRequestException(
        'Batas permintaan OTP harian tercapai. Coba lagi besok.',
      );
    }

    // Check if WhatsApp client is available
    if (!this.clientService.isAvailable()) {
      throw new BadRequestException('Layanan WhatsApp sedang tidak tersedia');
    }

    // Check number is not already used by another employee
    const existing = await this.prisma.employee.findFirst({
      where: {
        whatsapp_number: normalized,
        id: { not: employeeId },
        whatsapp_verified: true,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Nomor ini sudah terdaftar oleh karyawan lain',
      );
    }

    // Generate OTP
    const code = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store pending verification
    this.pendingVerifications.set(employeeId, {
      employeeId,
      phone: normalized,
      code,
      expiresAt,
      attempts: 0,
    });

    // Update employee record (unverified)
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        whatsapp_number: normalized,
        whatsapp_verified: false,
        whatsapp_verified_at: null,
        updated_at: new Date(),
      },
    });

    // Send OTP via WhatsApp
    const message = `🔐 Kode verifikasi TARA Anda: *${code}*\n\nKode ini berlaku ${this.OTP_EXPIRY_MINUTES} menit.\nJangan bagikan kode ini ke siapa pun.`;

    const sendResult = await this.clientService.sendText(normalized, message);

    // Log the OTP message
    await this.auditService.logMessage({
      employee_id: employeeId,
      direction: 'outbound',
      message_type: 'otp',
      content: '[OTP VERIFICATION]', // Don't log actual OTP
      wa_message_id: sendResult.messageId,
      wa_status: sendResult.success ? 'sent' : 'failed',
      metadata: { purpose: 'verification', phone: normalized },
    });

    // Emit event
    await this.eventBusService.emit({
      event_type: 'whatsapp.verification.sent',
      event_version: '1.0',
      actor: { id: employeeId, type: 'employee' },
      entity: { id: employeeId, type: 'employee' },
      payload: {
        phone: normalized,
        success: sendResult.success,
      },
    });

    if (!sendResult.success) {
      this.pendingVerifications.delete(employeeId);
      return { success: false, message: 'Gagal mengirim OTP. Pastikan nomor WhatsApp aktif.' };
    }

    this.logger.log(`[VERIFY] OTP sent to ${normalized} for employee ${employeeId}`);

    return {
      success: true,
      message: `Kode verifikasi telah dikirim ke ${this.maskPhone(normalized)}`,
    };
  }

  /**
   * Confirm OTP code and verify the WhatsApp number.
   */
  async confirmVerification(
    employeeId: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    const pending = this.pendingVerifications.get(employeeId);

    if (!pending) {
      throw new BadRequestException('Tidak ada permintaan verifikasi yang aktif');
    }

    // Check expiry
    if (new Date() > pending.expiresAt) {
      this.pendingVerifications.delete(employeeId);
      throw new BadRequestException('Kode verifikasi sudah kedaluwarsa. Minta kode baru.');
    }

    // Check attempts
    pending.attempts++;
    if (pending.attempts > this.MAX_ATTEMPTS) {
      this.pendingVerifications.delete(employeeId);
      throw new BadRequestException('Terlalu banyak percobaan. Minta kode baru.');
    }

    // Validate code
    if (code !== pending.code) {
      return {
        success: false,
        message: `Kode salah. Sisa percobaan: ${this.MAX_ATTEMPTS - pending.attempts}`,
      };
    }

    // Success! Mark as verified
    const now = new Date();
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        whatsapp_verified: true,
        whatsapp_opted_in: true,
        whatsapp_verified_at: now,
        updated_at: now,
      },
    });

    this.pendingVerifications.delete(employeeId);

    // Send confirmation message
    await this.clientService.sendText(
      pending.phone,
      '✅ Nomor WhatsApp Anda berhasil diverifikasi!\n\nAnda sekarang dapat berkomunikasi dengan Hermes AI melalui WhatsApp ini.',
    );

    // Emit event
    await this.eventBusService.emit({
      event_type: 'whatsapp.verification.confirmed',
      event_version: '1.0',
      actor: { id: employeeId, type: 'employee' },
      entity: { id: employeeId, type: 'employee' },
      payload: {
        phone: pending.phone,
        verified_at: now.toISOString(),
      },
    });

    this.logger.log(`[VERIFY] Employee ${employeeId} verified: ${pending.phone}`);

    return { success: true, message: 'Nomor WhatsApp berhasil diverifikasi!' };
  }

  /**
   * Revoke WhatsApp opt-in (disconnect).
   */
  async revokeWhatsApp(employeeId: string): Promise<void> {
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        whatsapp_opted_in: false,
        whatsapp_verified: false,
        whatsapp_verified_at: null,
        updated_at: new Date(),
      },
    });

    this.pendingVerifications.delete(employeeId);

    await this.eventBusService.emit({
      event_type: 'whatsapp.opted_out',
      event_version: '1.0',
      actor: { id: employeeId, type: 'employee' },
      entity: { id: employeeId, type: 'employee' },
      payload: { reason: 'user_revoked' },
    });

    this.logger.log(`[VERIFY] Employee ${employeeId} revoked WhatsApp opt-in`);
  }

  /**
   * Get WhatsApp status for an employee.
   */
  async getStatus(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        whatsapp_number: true,
        whatsapp_opted_in: true,
        whatsapp_verified: true,
        whatsapp_verified_at: true,
      },
    });

    return {
      number: employee?.whatsapp_number ? this.maskPhone(employee.whatsapp_number) : null,
      opted_in: employee?.whatsapp_opted_in || false,
      verified: employee?.whatsapp_verified || false,
      verified_at: employee?.whatsapp_verified_at,
      has_pending_verification: this.pendingVerifications.has(employeeId),
    };
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private normalizePhone(phone: string): string {
    let normalized = phone.replace(/[\s\-\(\)]/g, '');
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }
    if (normalized.startsWith('08')) {
      normalized = '62' + normalized.substring(1);
    }
    return normalized;
  }

  private isValidPhone(phone: string): boolean {
    // Must be 10-15 digits, start with country code
    return /^\d{10,15}$/.test(phone);
  }

  private maskPhone(phone: string): string {
    if (phone.length < 6) return '****';
    return phone.substring(0, 4) + '****' + phone.substring(phone.length - 4);
  }

  private async getDailyRequestCount(employeeId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.whatsAppMessageLog.count({
      where: {
        employee_id: employeeId,
        message_type: 'otp',
        direction: 'outbound',
        created_at: { gte: today },
      },
    });
  }
}
