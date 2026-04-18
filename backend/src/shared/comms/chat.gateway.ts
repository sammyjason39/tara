import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    const tenant_id = client.handshake.query.tenant_id as string;
    const user_id = client.handshake.query.user_id as string;

    if (tenant_id && user_id) {
      // Logic for user presence can be added here
      client.join(`tenant_${tenant_id}`);
      client.join(`user_${user_id}`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; body: string; tenant_id: string; user_id: string },
  ) {
    const message = await this.chatService.sendMessage({
      tenant_id: payload.tenant_id,
      roomId: payload.roomId,
      senderId: payload.user_id,
      body: payload.body,
    });

    // Part 7: broadcast newMessage
    this.server.to(`room_${payload.roomId}`).emit('newMessage', message);
  }

  @SubscribeMessage('messageDelivered')
  async handleMessageDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string },
  ) {
    const updated = await this.chatService.updateMessageStatus(payload.messageId, 'DELIVERED');
    // Notify sender that message was delivered
    this.server.to(`user_${updated.sender_id}`).emit('messageStatusUpdated', updated);
  }

  @SubscribeMessage('messagesRead')
  async handleMessagesRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string, user_id: string },
  ) {
    await this.chatService.markAsRead(payload.roomId, payload.user_id);
    // Broadcast status change to room members
    this.server.to(`room_${payload.roomId}`).emit('roomRead', { roomId: payload.roomId, user_id: payload.user_id });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, roomId: string) {
    client.join(`room_${roomId}`);
    return { status: 'joined', roomId };
  }
}
