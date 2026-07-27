import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { NOTIFICATION_TRIGGERS, NotificationTrigger } from '../common/notification-triggers';
import { CreateTemplateDto, TemplateResponseDto, UpdateTemplateDto } from './dto/notification-template.dto';
import { NotificationTemplatesService } from './notification-templates.service';

@ApiTags('notification-templates')
@ApiBearerAuth()
@Controller('notification-templates')
export class NotificationTemplatesController {
  constructor(private readonly templates: NotificationTemplatesService) {}

  @Get('triggers')
  @Permissions('template.read')
  @ApiOperation({
    summary: 'Trigger catalog',
    description: 'Every event a template can be attached to, in both languages — powers the trigger dropdown when creating a template.',
  })
  triggers(): NotificationTrigger[] {
    return NOTIFICATION_TRIGGERS;
  }

  @Get()
  @Permissions('template.read')
  @ApiOperation({ summary: 'List all notification templates (both languages)' })
  @ApiResponse({ status: 200, type: [TemplateResponseDto] })
  findAll(): Promise<TemplateResponseDto[]> {
    return this.templates.findAll();
  }

  @Post()
  @Permissions('template.update')
  @ApiOperation({
    summary: 'Create a notification template',
    description: 'Always creates an English + Swahili pair tied to one trigger. Returns the English row.',
  })
  @ApiResponse({ status: 201, type: TemplateResponseDto })
  create(@Body() dto: CreateTemplateDto): Promise<TemplateResponseDto> {
    return this.templates.create(dto);
  }

  @Patch(':code')
  @Permissions('template.update')
  @ApiOperation({ summary: 'Edit a template', description: 'Subject and body only — name, trigger and language are fixed after creation.' })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  update(@Param('code') code: string, @Body() dto: UpdateTemplateDto): Promise<TemplateResponseDto> {
    return this.templates.update(code, dto);
  }
}
