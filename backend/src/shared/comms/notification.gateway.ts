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
    const tenant_id = client.handshake.query.tenant_id as string;
    const user_id = client.handshake.query.user_id as string;

    if (tenant_id && user_id) {
      client.join(`user_${user_id}`);
      
      try {
          // Sync initial counts on first connection
          const counts = await this.notificationService.getUnreadCounts(tenant_id, user_id);
          client.emit('sync_counts', counts);
      } catch (err) {
          console.error('[NotificationGateway] Sync Init Fail:', err);
      }
    }
  }

  /**
   * Internal method to broadcast a notification to a specific user
   */
  async broadcastNotification(params: { tenant_id: string; user_id: string; notification: any }) {
    if (!this.server) return;
    
    // 1. Send the specific notification payload
    this.server.to(`user_${params.user_id}`).emit('new_notification', params.notification);
    
    // 2. Trigger count sync for the user
    try {
      const counts = await this.notificationService.getUnreadCounts(params.tenant_id, params.user_id);
      this.server.to(`user_${params.user_id}`).emit('sync_counts', counts);
    } catch (err) {
        console.error('[NotificationGateway] Count Refresh Fail:', err);
    }
  }

  /**
   * Triggered by services to notify UI to refresh all unread counts
   */
  async refreshCounts(tenant_id: string, user_id: string) {
    if (!this.server) return;
    try {
        const counts = await this.notificationService.getUnreadCounts(tenant_id, user_id);
        this.server.to(`user_${user_id}`).emit('sync_counts', counts);
    } catch (err) {
        console.error('[NotificationGateway] Manual Refresh Fail:', err);
    }
  }
}
