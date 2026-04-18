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
    const tenant_id = req.tenantContext?.tenant_id;
    return this.bulletinService.getPosts(tenant_id, filters);
  }

  @Get('bulletin/:id')
  async getBulletinDetail(@Req() req: any, @Param('id') id: string) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.bulletinService.getPostById(tenant_id, id);
  }

  @Post('bulletin')
  async createBulletin(@Req() req: any, @Body() body: any) {
    const context = req.tenantContext;
    return this.bulletinService.createPost({
      ...body,
      tenant_id: context.tenant_id,
      authorId: context.user_id,
    });
  }

  @Patch('bulletin/:id')
  async updateBulletin(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.bulletinService.updatePost(tenant_id, id, body);
  }

  @Delete('bulletin/:id')
  async deleteBulletin(@Req() req: any, @Param('id') id: string) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.bulletinService.deletePost(tenant_id, id);
  }

  @Post('bulletin/:id/react')
  async reactToBulletin(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const context = req.tenantContext;
    return this.bulletinService.toggleReaction({
      postId: id,
      tenant_id: context.tenant_id,
      user_id: context.user_id,
      type: body.type || 'LIKE',
    });
  }

  @Post('bulletin/:id/comment')
  async commentOnBulletin(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const context = req.tenantContext;
    return this.bulletinService.addComment({
      postId: id,
      tenant_id: context.tenant_id,
      authorId: context.user_id,
      body: body.body,
    });
  }

  // Bulletin Categories
  @Get('bulletin-categories')
  async getBulletinCategories(@Req() req: any) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.bulletinService.getCategories(tenant_id);
  }

  @Post('bulletin-categories')
  async createBulletinCategory(@Req() req: any, @Body() body: any) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.bulletinService.createCategory(tenant_id, body);
  }

  @Patch('bulletin-categories/:id')
  async updateBulletinCategory(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.bulletinService.updateCategory(tenant_id, id, body);
  }

  @Delete('bulletin-categories/:id')
  async deleteBulletinCategory(@Req() req: any, @Param('id') id: string) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.bulletinService.deleteCategory(tenant_id, id);
  }

  // Mail Endpoints
  @Get('mail/messages')
  async getMailMessages(@Req() req: any, @Query('folder') folder: string, @Query() filters: any) {
    const context = req.tenantContext;
    return this.mailService.getMessages(context.tenant_id, context.user_id, folder || 'inbox', filters);
  }

  @Get('mail/accounts')
  async getMailAccounts(@Req() req: any) {
    const context = req.tenantContext;
    return this.mailService.getMailAccounts(context.tenant_id, context.user_id);
  }

  @Post('mail/send')
  async sendMail(@Req() req: any, @Body() body: any) {
    const context = req.tenantContext;
    return this.mailService.sendMail({
      ...body,
      tenant_id: context.tenant_id,
      user_id: context.user_id,
    });
  }

  @Patch('mail/:id/star')
  async toggleMailStar(@Req() req: any, @Param('id') id: string) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.mailService.toggleStar(tenant_id, id);
  }

  @Patch('mail/:id/read')
  async markMailAsRead(@Req() req: any, @Param('id') id: string) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.mailService.markAsRead(tenant_id, id);
  }

  @Delete('mail/:id')
  async deleteMail(@Req() req: any, @Param('id') id: string) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.mailService.deleteMail(tenant_id, id);
  }

  @Patch('mail/:id/restore')
  async restoreMail(@Req() req: any, @Param('id') id: string) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.mailService.restoreMail(tenant_id, id);
  }

  // Chat Endpoints
  @Get('chat/rooms')
  async getChatRooms(@Req() req: any) {
    const context = req.tenantContext;
    return this.chatService.getRooms(context.tenant_id, context.user_id);
  }

  @Get('chat/rooms/:roomId/messages')
  async getChatMessages(@Req() req: any, @Param('roomId') roomId: string, @Query() filters: any) {
    const tenant_id = req.tenantContext?.tenant_id;
    return this.chatService.getMessages(tenant_id, roomId, filters);
  }

  @Post('chat/rooms')
  async createChatRoom(@Req() req: any, @Body() body: any) {
    const context = req.tenantContext;
    const memberUserIds = body.memberUserIds || [context.user_id];
    if (!memberUserIds.includes(context.user_id)) {
      memberUserIds.push(context.user_id);
    }
    
    return this.chatService.createRoom({
      ...body,
      tenant_id: context.tenant_id,
      createdBy: context.user_id,
      memberUserIds,
    });
  }

  // Notification Endpoints
  @Get('notifications')
  async getNotifications(@Req() req: any, @Query() filters: any) {
    const context = req.tenantContext;
    return this.notificationService.getNotifications(context.tenant_id, context.user_id, filters);
  }

  @Patch('notifications/:id/read')
  async markNotificationRead(@Req() req: any, @Param('id') id: string) {
    const context = req.tenantContext;
    return this.notificationService.markAsRead(context.tenant_id, id);
  }

  @Post('notifications/read-all')
  async markAllNotificationsRead(@Req() req: any) {
    const context = req.tenantContext;
    return this.notificationService.markAllAsRead(context.tenant_id, context.user_id);
  }

  @Get('notifications/counts')
  async getUnreadCounts(@Req() req: any) {
    const context = req.tenantContext;
    return this.notificationService.getUnreadCounts(context.tenant_id, context.user_id);
  }
}
