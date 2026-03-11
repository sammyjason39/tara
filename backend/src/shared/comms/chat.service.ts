import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    private readonly notificationService: NotificationService,
  ) {}

  async createRoom(params: {
    tenantId: string;
    createdBy: string;
    type: 'DIRECT' | 'GROUP' | 'DEPARTMENT' | 'LOCATION' | 'ROLE' | 'COMPANY';
    name?: string;
    memberUserIds: string[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.chatRoom.create({
        data: {
          tenantId: params.tenantId,
          createdBy: params.createdBy,
          type: params.type,
          name: params.name || null,
        },
      });

      await tx.chatMember.createMany({
        data: params.memberUserIds.map((userId) => ({
          roomId: room.id,
          tenantId: params.tenantId,
          userId,
          role: userId === params.createdBy ? 'admin' : 'member',
        })),
      });

      // Hydrate name for DIRECT chats if not provided
      if (room.type === 'DIRECT' && !room.name) {
        const otherUserId = params.memberUserIds.find(uid => uid !== params.createdBy);
        if (otherUserId) {
          const user = await tx.user.findUnique({
            where: { id: otherUserId },
            select: { firstName: true, lastName: true, email: true }
          });
          if (user) {
            if (user.firstName || user.lastName) {
              room.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            } else {
              room.name = user.email;
            }
          }
        }
      }

      return room;
    });
  }

  async getRooms(tenantId: string, userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        tenantId,
        members: {
          some: { userId },
        },
        deletedAt: null,
      },
      include: {
        members: true,
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // For DIRECT rooms, we need to find the other user's identity
    return Promise.all(rooms.map(async (room) => {
      if (room.type === 'DIRECT' && !room.name) {
        const otherMember = room.members.find(m => m.userId !== userId);
        if (otherMember) {
          const user = await this.prisma.user.findUnique({
            where: { id: otherMember.userId },
            select: { firstName: true, lastName: true, email: true }
          });
          
          let displayName = 'Unknown Contact';
          if (user) {
            if (user.firstName || user.lastName) {
              displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            } else {
              displayName = user.email;
            }
          }
          
          return {
            ...room,
            name: displayName
          };
        }
      }
      return room;
    }));
  }

  async getMessages(tenantId: string, roomId: string, filters: any) {
    const limit = filters.limit ?? 50;
    const skip = filters.skip ?? 0;

    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId, tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        reactions: true,
      }
    });

    // Enhance with sender names
    return Promise.all(messages.map(async (msg) => {
      const user = await this.prisma.user.findUnique({
        where: { id: msg.senderId },
        select: { firstName: true, lastName: true }
      });
      return {
        ...msg,
        senderName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User'
      };
    }));
  }

  async sendMessage(params: {
    tenantId: string;
    roomId: string;
    senderId: string;
    body: string;
    type?: string;
    attachments?: any;
    refModule?: string;
    refEntityId?: string;
  }) {
    const message = await this.prisma.chatMessage.create({
      data: {
        tenantId: params.tenantId,
        roomId: params.roomId,
        senderId: params.senderId,
        body: params.body,
        type: params.type ?? 'text',
        attachments: params.attachments || null,
        refModule: params.refModule || null,
        refEntityId: params.refEntityId || null,
      },
    });

    // Refresh counts and notify all members except sender
    const members = await this.prisma.chatMember.findMany({
      where: { roomId: params.roomId, tenantId: params.tenantId }
    });
    
    // Get sender info for notification
    const sender = await this.prisma.user.findUnique({
      where: { id: params.senderId },
      select: { firstName: true, lastName: true }
    });
    const senderName = sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() : 'Unknown';

    for (const member of members) {
      if (member.userId !== params.senderId) {
        const notif = await this.notificationService.createNotification({
          tenantId: params.tenantId,
          userId: member.userId,
          title: 'Secure Comms Message',
          message: `${senderName}: ${params.body.substring(0, 50)}${params.body.length > 50 ? '...' : ''}`,
          type: 'CHAT',
          link: '/core/chat'
        });

        await this.notificationGateway.broadcastNotification({
           tenantId: params.tenantId,
           userId: member.userId,
           notification: notif
        });
      }
    }

    return message;
  }
}
