import { Controller, Get, Post, Body, UseGuards, Inject, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TenantGuard } from '../../../shared/guards/tenant.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../../shared/roles';
import { TenantCtx } from '../../../gateway/tenant-context.decorator';
import { TenantContext } from '../../../gateway/tenant-context.interface';
import { IJVRepository } from '../repositories/interfaces/jv.repository.interface';
import { PrismaService } from '../../../persistence/prisma.service';

@Controller('finance/jv')
@UseGuards(TenantGuard, RolesGuard)
export class JVController {
  constructor(
    @Inject('IJVRepository') private readonly jvRepo: IJVRepository,
    private readonly prisma: PrismaService
  ) {}

  @Get('profiles')
  async getProfiles(@TenantCtx() ctx: TenantContext) {
    return this.jvRepo.findProfileByScope(ctx.tenant_id, {});
  }

  @Get('participations')
  async getParticipations(@TenantCtx() ctx: TenantContext) {
    return this.jvRepo.findParticipation(ctx.tenant_id, "");
  }

  @Post('invite')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async invitePartner(@TenantCtx() ctx: TenantContext, @Body() dto: any) {
    const token = randomUUID();
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);

    return this.prisma.finance_jv_invitations.create({
      data: {
        jv_profile_id: dto.jv_profile_id,
        email: dto.email,
        token,
        role: dto.role || 'NON_OPERATOR',
        revenue_share: dto.revenue_share || 0,
        profit_share: dto.profit_share || 0,
        expires_at
      }
    });
  }

  @Post('accept-invite')
  async acceptInvite(@TenantCtx() ctx: TenantContext, @Body() dto: { token: string }) {
    const invite = await this.prisma.finance_jv_invitations.findUnique({
      where: { token: dto.token, status: 'PENDING' }
    });

    if (!invite) throw new BadRequestException("Invalid or expired invitation");

    // 1. Create Participant
    await this.prisma.finance_jv_participants.create({
      data: {
        jv_profile_id: invite.jv_profile_id,
        participant_tenant_id: ctx.tenant_id,
        revenue_share_pct: invite.revenue_share,
        profit_share_pct: invite.profit_share,
        role: invite.role
      }
    });

    // 2. Mark accepted
    return this.prisma.finance_jv_invitations.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' }
    });
  }
}
