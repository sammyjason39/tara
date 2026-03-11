import { Module } from '@nestjs/common';
import { BulletinService } from './bulletin.service';
import { MailService } from './mail.service';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { CommsController } from './comms.controller';
import { PersistenceModule } from '../../persistence/persistence.module';

@Module({
  imports: [PersistenceModule],
  providers: [BulletinService, MailService, ChatService, ChatGateway, NotificationService, NotificationGateway],
  controllers: [CommsController],
  exports: [BulletinService, MailService, ChatService, NotificationService, NotificationGateway],
})
export class CommsModule {}
