import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(params: {
    tenantId: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link || null,
      },
    });
  }

  async getNotifications(tenantId: string, userId: string, filters: any = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { tenantId, userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { tenantId, userId },
      }),
    ]);

    return { data, total, page, limit };
  }

  async markAsRead(tenantId: string, id: string) {
    return this.prisma.notification.update({
      where: { id, tenantId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCounts(tenantId: string, userId: string) {
    // Get mail account first
    const account = await this.prisma.mailAccount.findFirst({
      where: { tenantId, userId, deletedAt: null }
    });

    const [notifCount, mailCount, rooms] = await Promise.all([
      this.prisma.notification.count({
        where: { tenantId, userId, isRead: false },
      }),
      account ? this.prisma.mailMessage.count({
        where: { 
          tenantId, 
          toAddresses: { array_contains: account.address }, 
          isRead: false,
          status: 'sent',
          deletedAt: null 
        }
      }) : Promise.resolve(0),
      this.prisma.chatRoom.findMany({
        where: {
          tenantId,
          members: { some: { userId } },
          deletedAt: null
        },
        include: {
          members: { where: { userId } }
        }
      })
    ]);

    // For chats, we'd ideally compare message count vs lastReadAt, 
    // but for now let's return rooms with any unread flag if possible
    // A more advanced query would be needed for exact Chat unread count.
    const chatCount = rooms.length; // Placeholder: Just returning count of joined rooms for now

    return {
      total: notifCount + mailCount + chatCount,
      notifications: notifCount,
      mail: mailCount,
      chat: chatCount
    };
  }
}
