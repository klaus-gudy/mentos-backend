import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotificationResponseDto, SendNotificationDto } from './dto/notification.dto';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<NotificationResponseDto[]> {
    const rows = await this.notifications.find({ order: { createdAt: 'DESC' } });
    return NotificationResponseDto.fromMany(rows);
  }

  // The only writer in this pass — a future dispatch pipeline (fired off
  // tenant/lease/invoice/maintenance events, matched against a template's
  // triggerKey) would call this same insert path.
  async send(dto: SendNotificationDto): Promise<NotificationResponseDto> {
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
      notification.type = dto.type;
      notification.read = false;
      notification.title = dto.title;
      notification.body = dto.body;
      notification.icon = dto.icon || 'bell';

      const saved = await repo.save(notification);
      return NotificationResponseDto.from(saved);
    });
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
