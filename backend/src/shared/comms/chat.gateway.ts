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
    const tenantId = client.handshake.query.tenantId as string;
    const userId = client.handshake.query.userId as string;

    if (tenantId && userId) {
      // Logic for user presence can be added here
      client.join(`tenant_${tenantId}`);
      client.join(`user_${userId}`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; body: string; tenantId: string; userId: string },
  ) {
    const message = await this.chatService.sendMessage({
      tenantId: payload.tenantId,
      roomId: payload.roomId,
      senderId: payload.userId,
      body: payload.body,
    });

    // Emit to all users in the room
    this.server.to(`room_${payload.roomId}`).emit('newMessage', message);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, roomId: string) {
    client.join(`room_${roomId}`);
    return { status: 'joined', roomId };
  }
}
