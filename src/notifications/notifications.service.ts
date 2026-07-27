import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotificationResponseDto, SendNotificationDto } from './dto/notification.dto';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationTemplatesService } from './notification-templates.service';

interface NewNotification {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly templates: NotificationTemplatesService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<NotificationResponseDto[]> {
    const rows = await this.notifications.find({ order: { createdAt: 'DESC' } });
    return NotificationResponseDto.fromMany(rows);
  }

  async send(dto: SendNotificationDto): Promise<NotificationResponseDto> {
    const saved = await this.insert(dto);
    return NotificationResponseDto.from(saved);
  }

  private async insert(input: NewNotification): Promise<Notification> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Notification);
      await manager.query('LOCK TABLE notifications IN SHARE ROW EXCLUSIVE MODE');

      const row = await repo
        .createQueryBuilder('n')
        .select('COALESCE(MAX(CAST(SUBSTRING(n.code FROM 7) AS INTEGER)), 0)', 'max')
        .getRawOne<{ max: string }>();
      const seq = parseInt(row?.max ?? '0', 10) + 1;

      const notification = new Notification();
      notification.code = `NOTIF-${String(seq).padStart(2, '0')}`;
      notification.type = input.type;
      notification.read = false;
      notification.title = input.title;
      notification.body = input.body;
      notification.icon = input.icon || 'bell';

      return repo.save(notification);
    });
  }

  /**
   * Tier-1 auto-dispatch: called by TenantsService/LeasesService after a
   * tenant is onboarded or a lease is created (see ARCHITECTURE.md-style
   * comment there), matched against every English-language template whose
   * `triggerKey` equals the given trigger. One notification is created per
   * matching template — an admin can have several templates for the same
   * trigger. Placeholders are `{{snake_case}}` tokens, replaced from `vars`;
   * any token with no matching var is left as-is rather than throwing, since
   * a template author might reference a variable this particular trigger
   * doesn't supply.
   *
   * Deliberately fire-and-forget: a notification failing to send must never
   * fail the tenant/lease creation it's describing, same philosophy as
   * AuditService.record() and MailService.
   */
  async fireTrigger(
    triggerKey: string,
    vars: Record<string, string>,
    type: NotificationType,
    icon?: string,
  ): Promise<void> {
    try {
      const matches = await this.templates.findByTrigger(triggerKey);
      for (const template of matches) {
        await this.insert({
          type,
          title: NotificationsService.render(template.subject, vars),
          body: NotificationsService.render(template.body, vars),
          icon,
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to fire notifications for trigger "${triggerKey}"`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private static render(text: string, vars: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (token, key: string) => vars[key] ?? token);
  }

  async markRead(code: string): Promise<NotificationResponseDto> {
    const notification = await this.notifications.findOne({ where: { code } });
    if (!notification) throw new NotFoundException(`Notification "${code}" not found`);
    notification.read = true;
    const saved = await this.notifications.save(notification);
    return NotificationResponseDto.from(saved);
  }

  async markAllRead(): Promise<{ updated: number }> {
    const result = await this.notifications.update({ read: false }, { read: true });
    return { updated: result.affected ?? 0 };
  }
}
