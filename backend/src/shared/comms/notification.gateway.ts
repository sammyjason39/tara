import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationService } from './notification.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'notifications',
})
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly notificationService: NotificationService) {}

  async handleConnection(client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    const userId = client.handshake.query.userId as string;

    if (tenantId && userId) {
      client.join(`user_${userId}`);
      
      try {
          // Sync initial counts on first connection
          const counts = await this.notificationService.getUnreadCounts(tenantId, userId);
          client.emit('sync_counts', counts);
      } catch (err) {
          console.error('[NotificationGateway] Sync Init Fail:', err);
      }
    }
  }

  /**
   * Internal method to broadcast a notification to a specific user
   */
  async broadcastNotification(params: { tenantId: string; userId: string; notification: any }) {
    if (!this.server) return;
    
    // 1. Send the specific notification payload
    this.server.to(`user_${params.userId}`).emit('new_notification', params.notification);
    
    // 2. Trigger count sync for the user
    try {
      const counts = await this.notificationService.getUnreadCounts(params.tenantId, params.userId);
      this.server.to(`user_${params.userId}`).emit('sync_counts', counts);
    } catch (err) {
        console.error('[NotificationGateway] Count Refresh Fail:', err);
    }
  }

  /**
   * Triggered by services to notify UI to refresh all unread counts
   */
  async refreshCounts(tenantId: string, userId: string) {
    if (!this.server) return;
    try {
        const counts = await this.notificationService.getUnreadCounts(tenantId, userId);
        this.server.to(`user_${userId}`).emit('sync_counts', counts);
    } catch (err) {
        console.error('[NotificationGateway] Manual Refresh Fail:', err);
    }
  }
}
