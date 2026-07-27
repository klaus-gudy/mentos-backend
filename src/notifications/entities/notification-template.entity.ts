import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/** Matches mentos-frontend's `TemplateLanguage` exactly. */
export enum TemplateLanguage {
  English = 'en',
  Swahili = 'sw',
}

/**
 * A notification message template, tied to one trigger from
 * common/notification-triggers.ts. Creating a template always produces an
 * English + Swahili pair (see NotificationsService.createTemplate) — each
 * language is its own row so either can be edited independently, linked by
 * `pairCode` (the English row's own code).
 */
@Entity('notification_templates')
export class NotificationTemplate extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  /** The English row's code — lets the two language rows of one template find each other. */
  @Index()
  @Column({ type: 'varchar', length: 32 })
  pairCode: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  /** One of common/notification-triggers.ts's keys. */
  @Column({ type: 'varchar', length: 40 })
  triggerKey: string;

  @Column({ type: 'enum', enum: TemplateLanguage })
  language: TemplateLanguage;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'text' })
  body: string;
}
