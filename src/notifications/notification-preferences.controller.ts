import { BadRequestException, Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { isValidPrefsShape, NotifPrefsShape } from './dto/notification-preference.dto';
import { NotificationPreferencesService } from './notification-preferences.service';

@ApiTags('notification-preferences')
@ApiBearerAuth()
@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly preferences: NotificationPreferencesService) {}

  @Get()
  @Permissions('notification.configure')
  @ApiOperation({ summary: 'Get notification channel preferences' })
  get(): Promise<NotifPrefsShape> {
    return this.preferences.get();
  }

  @Put()
  @Permissions('notification.configure')
  @ApiOperation({
    summary: 'Replace notification channel preferences',
    description: 'Body is the full preferences object, as returned by GET — mirrors mentos-frontend\'s NotifPrefs exactly.',
  })
  set(@Body() body: unknown): Promise<NotifPrefsShape> {
    if (!isValidPrefsShape(body)) {
      throw new BadRequestException('Each preference entry needs label, email, sms and inapp.');
    }
    return this.preferences.set(body);
  }
}
