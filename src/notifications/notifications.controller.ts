import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { NotificationResponseDto, SendNotificationDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @Permissions('notification.read')
  @ApiOperation({ summary: 'List all notifications' })
  @ApiResponse({ status: 200, type: [NotificationResponseDto] })
  findAll(): Promise<NotificationResponseDto[]> {
    return this.notifications.findAll();
  }

  @Post()
  @Permissions('notification.send')
  @ApiOperation({ summary: 'Send an announcement', description: 'The only way a notification is created in this pass — no automatic dispatch yet.' })
  @ApiResponse({ status: 201, type: NotificationResponseDto })
  send(@Body() dto: SendNotificationDto): Promise<NotificationResponseDto> {
    return this.notifications.send(dto);
  }

  @Post(':code/read')
  @Permissions('notification.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark one notification read' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  markRead(@Param('code') code: string): Promise<NotificationResponseDto> {
    return this.notifications.markRead(code);
  }

  @Post('read-all')
  @Permissions('notification.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark every notification read' })
  markAllRead(): Promise<{ updated: number }> {
    return this.notifications.markAllRead();
  }
}
