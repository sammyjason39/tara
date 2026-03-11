import { Controller, Get, Post, Patch, Delete, Body, Query, Req, Param } from '@nestjs/common';
import { BulletinService } from './bulletin.service';
import { MailService } from './mail.service';
import { ChatService } from './chat.service';
import { NotificationService } from './notification.service';

@Controller('comms')
export class CommsController {
  constructor(
    private readonly bulletinService: BulletinService,
    private readonly mailService: MailService,
    private readonly chatService: ChatService,
    private readonly notificationService: NotificationService,
  ) {}

  // Bulletin Endpoints
  @Get('bulletin')
  async getBulletins(@Req() req: any, @Query() filters: any) {
    const tenantId = req.tenantContext?.tenantId;
    return this.bulletinService.getPosts(tenantId, filters);
  }

  @Get('bulletin/:id')
  async getBulletinDetail(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantContext?.tenantId;
    return this.bulletinService.getPostById(tenantId, id);
  }

  @Post('bulletin')
  async createBulletin(@Req() req: any, @Body() body: any) {
    const context = req.tenantContext;
    return this.bulletinService.createPost({
      ...body,
      tenantId: context.tenantId,
      authorId: context.userId,
    });
  }

  @Patch('bulletin/:id')
  async updateBulletin(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const tenantId = req.tenantContext?.tenantId;
    return this.bulletinService.updatePost(tenantId, id, body);
  }

  @Delete('bulletin/:id')
  async deleteBulletin(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantContext?.tenantId;
    return this.bulletinService.deletePost(tenantId, id);
  }

  @Post('bulletin/:id/react')
  async reactToBulletin(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const context = req.tenantContext;
    return this.bulletinService.toggleReaction({
      postId: id,
      tenantId: context.tenantId,
      userId: context.userId,
      type: body.type || 'LIKE',
    });
  }

  @Post('bulletin/:id/comment')
  async commentOnBulletin(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const context = req.tenantContext;
    return this.bulletinService.addComment({
      postId: id,
      tenantId: context.tenantId,
      authorId: context.userId,
      body: body.body,
    });
  }

  // Bulletin Categories
  @Get('bulletin-categories')
  async getBulletinCategories(@Req() req: any) {
    const tenantId = req.tenantContext?.tenantId;
    return this.bulletinService.getCategories(tenantId);
  }

  @Post('bulletin-categories')
  async createBulletinCategory(@Req() req: any, @Body() body: any) {
    const tenantId = req.tenantContext?.tenantId;
    return this.bulletinService.createCategory(tenantId, body);
  }

  @Patch('bulletin-categories/:id')
  async updateBulletinCategory(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const tenantId = req.tenantContext?.tenantId;
    return this.bulletinService.updateCategory(tenantId, id, body);
  }

  @Delete('bulletin-categories/:id')
  async deleteBulletinCategory(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantContext?.tenantId;
    return this.bulletinService.deleteCategory(tenantId, id);
  }

  // Mail Endpoints
  @Get('mail/messages')
  async getMailMessages(@Req() req: any, @Query('folder') folder: string, @Query() filters: any) {
    const context = req.tenantContext;
    return this.mailService.getMessages(context.tenantId, context.userId, folder || 'inbox', filters);
  }

  @Get('mail/accounts')
  async getMailAccounts(@Req() req: any) {
    const context = req.tenantContext;
    return this.mailService.getMailAccounts(context.tenantId, context.userId);
  }

  @Post('mail/send')
  async sendMail(@Req() req: any, @Body() body: any) {
    const context = req.tenantContext;
    return this.mailService.sendMail({
      ...body,
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }

  @Patch('mail/:id/star')
  async toggleMailStar(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantContext?.tenantId;
    return this.mailService.toggleStar(tenantId, id);
  }

  @Patch('mail/:id/read')
  async markMailAsRead(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantContext?.tenantId;
    return this.mailService.markAsRead(tenantId, id);
  }

  @Delete('mail/:id')
  async deleteMail(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantContext?.tenantId;
    return this.mailService.deleteMail(tenantId, id);
  }

  @Patch('mail/:id/restore')
  async restoreMail(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantContext?.tenantId;
    return this.mailService.restoreMail(tenantId, id);
  }

  // Chat Endpoints
  @Get('chat/rooms')
  async getChatRooms(@Req() req: any) {
    const context = req.tenantContext;
    return this.chatService.getRooms(context.tenantId, context.userId);
  }

  @Get('chat/rooms/:roomId/messages')
  async getChatMessages(@Req() req: any, @Param('roomId') roomId: string, @Query() filters: any) {
    const tenantId = req.tenantContext?.tenantId;
    return this.chatService.getMessages(tenantId, roomId, filters);
  }

  @Post('chat/rooms')
  async createChatRoom(@Req() req: any, @Body() body: any) {
    const context = req.tenantContext;
    const memberUserIds = body.memberUserIds || [context.userId];
    if (!memberUserIds.includes(context.userId)) {
      memberUserIds.push(context.userId);
    }
    
    return this.chatService.createRoom({
      ...body,
      tenantId: context.tenantId,
      createdBy: context.userId,
      memberUserIds,
    });
  }

  // Notification Endpoints
  @Get('notifications')
  async getNotifications(@Req() req: any, @Query() filters: any) {
    const context = req.tenantContext;
    return this.notificationService.getNotifications(context.tenantId, context.userId, filters);
  }

  @Patch('notifications/:id/read')
  async markNotificationRead(@Req() req: any, @Param('id') id: string) {
    const context = req.tenantContext;
    return this.notificationService.markAsRead(context.tenantId, id);
  }

  @Post('notifications/read-all')
  async markAllNotificationsRead(@Req() req: any) {
    const context = req.tenantContext;
    return this.notificationService.markAllAsRead(context.tenantId, context.userId);
  }

  @Get('notifications/counts')
  async getUnreadCounts(@Req() req: any) {
    const context = req.tenantContext;
    return this.notificationService.getUnreadCounts(context.tenantId, context.userId);
  }
}
