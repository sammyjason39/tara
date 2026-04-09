import { v4 as uuidv4 } from 'uuid';
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

  private buildDirectKey(userIds: string[]) {
    return [...userIds].sort().join("_");
  }

  async createRoom(params: {
    tenantId: string;
    createdBy: string;
    type: 'DIRECT' | 'GROUP' | 'DEPARTMENT' | 'LOCATION' | 'ROLE' | 'COMPANY';
    name?: string;
    memberUserIds: string[];
  }) {
    // Part 2: Prevent duplicate DIRECT chats
    let directKey: string | undefined;
    if (params.type === 'DIRECT') {
      directKey = this.buildDirectKey(params.memberUserIds);
      const existing = await this.prisma.chatRoom.findFirst({
        where: { tenantId: params.tenantId, type: 'DIRECT', directKey }
      });
      if (existing) return existing;
    }

    return this.prisma.$transaction(async (tx: any) => {
      const room = await tx.chatRoom.create({
        data: {
        id: uuidv4(),
        updatedAt: new Date(),
          tenantId: params.tenantId,
          createdBy: params.createdBy,
          type: params.type,
          name: params.name || null,
          directKey,
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

      return room;
    });
  }

  async getRooms(tenantId: string, userId: string) {
    // Part 1: Efficient DIRECT name resolution
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        tenantId,
        chatMembers: {
          some: { userId },
        },
        deletedAt: null,
      },
      include: {
        chatMembers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: { commsChatMessages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rooms.map((room: any) => {
      if (room.type === "DIRECT" && !room.name) {
        const other = room.members.find((m: any) => m.userId !== userId);
        if (!other?.user) {
          return { ...room, name: "Unknown Contact" };
        }

        const user = other.user;
        let displayName = "Unknown Contact";

        if (user.firstName || user.lastName) {
          displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        } else {
          displayName = user.email;
        }

        return {
          ...room,
          name: displayName,
          avatar: user.avatarUrl || room.avatarUrl
        };
      }
      return room;
    });
  }

  async getMessages(tenantId: string, roomId: string, filters: { limit?: number; cursor?: string }) {
    // Part 5: Cursor-based message pagination
    const limit = filters.limit ?? 50;

    const messages = await this.prisma.commsChatMessage.findMany({
      where: { 
        roomId, 
        tenantId, 
        deletedAt: null,
        createdAt: filters.cursor ? { lt: new Date(filters.cursor) } : undefined
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        chatReactions: true,
      }
    });

    // Enhance with sender names
    const items = await Promise.all(messages.map(async (msg: any) => {
      const user = await this.prisma.user.findUnique({
        where: { id: msg.senderId },
        select: { firstName: true, lastName: true, avatarUrl: true, email: true }
      });
      return {
        ...msg,
        senderName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown User',
        senderAvatar: user?.avatarUrl
      };
    }));

    return {
      messages: items,
      nextCursor: messages[messages.length - 1]?.createdAt
    };
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
    return this.prisma.$transaction(async (tx: any) => {
      const message = await tx.commsChatMessage.create({
        data: {
        id: uuidv4(),
        updatedAt: new Date(),
          tenantId: params.tenantId,
          roomId: params.roomId,
          senderId: params.senderId,
          body: params.body,
          type: params.type ?? 'text',
          attachments: params.attachments || null,
          refModule: params.refModule || null,
          refEntityId: params.refEntityId || null,
          status: 'SENT'
        },
      });

      // Part 4: Cache last message on room
      await tx.chatRoom.update({
        where: { id: params.roomId },
        data: {
          lastMessageId: message.id,
          lastMessageText: message.body,
          lastMessageAt: message.createdAt,
          updatedAt: message.createdAt
        }
      });

      // Part 3: Scalable unread tracking
      await tx.chatMember.updateMany({
        where: {
          roomId: params.roomId,
          userId: { not: params.senderId }
        },
        data: {
          unreadCount: { increment: 1 }
        }
      });

      // Notify all members except sender
      const members = await tx.chatMember.findMany({
        where: { roomId: params.roomId, tenantId: params.tenantId }
      });
      
      const sender = await tx.user.findUnique({
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
            link: '/core/chat',
            priority: 'NORMAL',
            eventReferenceId: message.id,
          });

          await this.notificationGateway.broadcastNotification({
             tenantId: params.tenantId,
             userId: member.userId,
             notification: notif
          });
        }
      }

      return message;
    });
  }

  async markAsRead(roomId: string, userId: string) {
    // Part 3: Reset unread count when room opened
    await this.prisma.chatMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: {
        unreadCount: 0,
        lastReadAt: new Date()
      }
    });

    // Part 7: Mark messages as READ
    await this.prisma.commsChatMessage.updateMany({
      where: {
        roomId,
        senderId: { not: userId },
        status: { not: 'READ' }
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });
  }

  async updateMessageStatus(messageId: string, status: 'DELIVERED' | 'READ') {
    const data: any = { status };
    if (status === 'DELIVERED') data.deliveredAt = new Date();
    if (status === 'READ') data.readAt = new Date();

    return this.prisma.commsChatMessage.update({
      where: { id: messageId },
      data
    });
  }
}
