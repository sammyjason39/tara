import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class MailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async getMessages(tenantId: string, userId: string, folder: string, filters: any = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    // Ensure user has at least one account
    let account = await this.prisma.mailAccount.findFirst({
      where: { tenantId, userId, deletedAt: null }
    });

    if (!account) {
      account = await this.prisma.mailAccount.create({
        data: {
          tenantId,
          userId,
          address: `${userId.split('-')[0]}@zenvix.internal`,
          type: 'internal',
          displayName: 'Employee Account',
          status: 'active'
        }
      });
    }

    const where: any = {
      tenantId,
      deletedAt: folder === 'trash' ? { not: null } : null,
    };

    if (folder === 'inbox') {
      // Internal inbox logic: where recipient includes account address
      where.toAddresses = { array_contains: account.address };
      where.status = 'sent';
      where.deletedAt = null;
    } else if (folder === 'sent') {
      where.fromAccountId = account.id;
      where.status = 'sent';
      where.deletedAt = null;
    } else if (folder === 'drafts') {
      where.fromAccountId = account.id;
      where.status = 'draft';
      where.deletedAt = null;
    } else if (folder === 'starred' || folder === 'flagged') {
      where.isStarred = true;
      where.deletedAt = null;
      // Should also be either from or to the user
      where.OR = [
        { fromAccountId: account.id },
        { toAddresses: { array_contains: account.address } }
      ];
    } else if (folder === 'trash') {
      where.deletedAt = { not: null };
      where.OR = [
        { fromAccountId: account.id },
        { toAddresses: { array_contains: account.address } }
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mailMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          fromAccount: true,
        }
      }),
      this.prisma.mailMessage.count({ where }),
    ]);

    return { data, total, page, limit, account };
  }

  async sendMail(params: {
    tenantId: string;
    userId: string;
    toAddresses: string[];
    ccAddresses?: string[];
    subject: string;
    bodyHtml?: string;
    bodyText: string;
    status?: string;
  }) {
    // 1. Get or Create user's sender account
    let account = await this.prisma.mailAccount.findFirst({
      where: { tenantId: params.tenantId, userId: params.userId, deletedAt: null }
    });

    if (!account) {
      account = await this.prisma.mailAccount.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          address: `${params.userId.split('-')[0]}@zenvix.internal`,
          type: 'internal',
          displayName: 'Employee Account',
          status: 'active'
        }
      });
    }

    // 2. Create Thread
    const thread = await this.prisma.mailThread.create({
      data: {
        tenantId: params.tenantId,
        subject: params.subject,
      },
    });

    // 3. Create Message
    const message = await this.prisma.mailMessage.create({
      data: {
        tenantId: params.tenantId,
        threadId: thread.id,
        fromAccountId: account.id,
        fromAddress: account.address,
        toAddresses: params.toAddresses as any,
        ccAddresses: params.ccAddresses as any,
        subject: params.subject,
        bodyHtml: params.bodyHtml,
        bodyText: params.bodyText,
        status: params.status || 'sent',
        sentAt: params.status === 'draft' ? null : new Date(),
      },
    });
    // 4. Notify all recipients
    if (message.status === 'sent') {
      for (const address of params.toAddresses) {
        const recipientAccount = await this.prisma.mailAccount.findFirst({
          where: { tenantId: params.tenantId, address, deletedAt: null }
        });
        if (recipientAccount && recipientAccount.userId !== params.userId) {
          // Create Notification record
          const notification = await this.notificationService.createNotification({
            tenantId: params.tenantId,
            userId: recipientAccount.userId,
            title: 'New Secure Transmission',
            message: `New organizational intel received from ${account.address}: ${params.subject}`,
            type: 'MAIL',
            link: '/core/mail'
          });

          // Broadcast real-time
          await this.notificationGateway.broadcastNotification({
            tenantId: params.tenantId,
            userId: recipientAccount.userId,
            notification
          });
        }
      }
    }

    return message;
  }

  async getMailAccounts(tenantId: string, userId: string) {
    return this.prisma.mailAccount.findMany({
      where: { tenantId, userId, deletedAt: null },
    });
  }

  async markAsRead(tenantId: string, id: string) {
    return this.prisma.mailMessage.update({
      where: { id, tenantId },
      data: { isRead: true },
    });
  }

  async toggleStar(tenantId: string, id: string) {
    const mail = await this.prisma.mailMessage.findUnique({ where: { id, tenantId } });
    if (!mail) throw new NotFoundException('Mail not found');

    return this.prisma.mailMessage.update({
      where: { id, tenantId },
      data: { isStarred: !mail.isStarred },
    });
  }

  async deleteMail(tenantId: string, id: string) {
    // If already in trash, delete permanently? No, let's stick to soft delete.
    const mail = await this.prisma.mailMessage.findUnique({ where: { id, tenantId } });
    if (mail?.deletedAt) {
      return this.prisma.mailMessage.delete({ where: { id, tenantId } });
    }
    return this.prisma.mailMessage.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  }

  async restoreMail(tenantId: string, id: string) {
    return this.prisma.mailMessage.update({
      where: { id, tenantId },
      data: { deletedAt: null },
    });
  }
}
