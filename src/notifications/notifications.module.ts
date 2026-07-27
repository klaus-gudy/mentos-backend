import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationTemplatesController } from './notification-templates.controller';
import { NotificationTemplatesService } from './notification-templates.service';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationTemplate, NotificationPreference])],
  controllers: [NotificationsController, NotificationTemplatesController, NotificationPreferencesController],
  providers: [NotificationsService, NotificationTemplatesService, NotificationPreferencesService],
  exports: [NotificationsService, NotificationTemplatesService, NotificationPreferencesService],
})
export class NotificationsModule {}
