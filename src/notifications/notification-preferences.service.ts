import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotifPrefsShape } from './dto/notification-preference.dto';
import { NotificationPreference } from './entities/notification-preference.entity';

// Default channel set, ported from mentos-frontend/lib/seed.ts `notifPrefs` —
// seeded into the single settings row the first time it's read.
const DEFAULT_PREFS: NotifPrefsShape = {
  rentDue: { label: 'Rent due reminders', email: true, sms: true, inapp: true },
  overdue: { label: 'Overdue payment alerts', email: true, sms: true, inapp: true },
  leaseExpiry: { label: 'Lease expiry reminders', email: true, sms: false, inapp: true },
  maintenance: { label: 'Maintenance updates', email: true, sms: false, inapp: true },
  announcements: { label: 'Announcements', email: true, sms: false, inapp: true },
};

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly prefs: Repository<NotificationPreference>,
  ) {}

  private async row(): Promise<NotificationPreference> {
    const existing = await this.prefs.find({ take: 1, order: { createdAt: 'ASC' } });
    if (existing.length) return existing[0];
    return this.prefs.save(this.prefs.create({ prefs: DEFAULT_PREFS }));
  }

  async get(): Promise<NotifPrefsShape> {
    return (await this.row()).prefs;
  }

  async set(next: NotifPrefsShape): Promise<NotifPrefsShape> {
    const row = await this.row();
    row.prefs = next;
    return (await this.prefs.save(row)).prefs;
  }
}
