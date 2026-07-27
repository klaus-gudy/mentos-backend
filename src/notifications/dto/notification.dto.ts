import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Notification, NotificationType } from '../entities/notification.entity';

/** Frontend-facing notification shape — mirrors mentos-frontend's `AppNotification` exactly. */
export class NotificationResponseDto {
  @ApiProperty({ example: 'NOTIF-01', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.Payment })
  type: NotificationType;

  @ApiProperty({ example: false })
  read: boolean;

  @ApiProperty({ example: '2026-07-04T10:24:00.000Z', description: 'ISO timestamp — the frontend formats this as a relative label ("12 min ago")' })
  time: string;

  @ApiProperty({ example: 'Payment received' })
  title: string;

  @ApiProperty({ example: 'Amina Hassan paid TSh 520,000 for INV-1009.' })
  body: string;

  @ApiProperty({ example: 'banknote' })
  icon: string;

  static from(notification: Notification): NotificationResponseDto {
    return {
      id: notification.code,
      type: notification.type,
      read: notification.read,
      time: notification.createdAt.toISOString(),
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
    };
  }

  static fromMany(notifications: Notification[]): NotificationResponseDto[] {
    return notifications.map((n) => NotificationResponseDto.from(n));
  }
}

/** Manually sending an announcement — the only way a notification is created in this pass. */
export class SendNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.System })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'Scheduled maintenance this weekend' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Water will be shut off at Mwenge Apartments on Saturday 08:00–12:00.' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: 'megaphone', description: 'Defaults to "bell" if omitted' })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  icon?: string;
}
