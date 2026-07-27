import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * Portfolio-wide notification channel preferences — a single settings row
 * (no multi-tenant org concept exists yet, matching how the rest of this
 * backend is scoped). `prefs` mirrors mentos-frontend's `NotifPrefs`
 * (`Record<string, { label, email, sms, inapp }>`) verbatim; validated shape
 * lives in the DTO, not the column, since the key set is UI-defined.
 */
@Entity('notification_preferences')
export class NotificationPreference extends BaseEntity {
  @Column({ type: 'jsonb' })
  prefs: Record<string, { label: string; email: boolean; sms: boolean; inapp: boolean }>;
}
