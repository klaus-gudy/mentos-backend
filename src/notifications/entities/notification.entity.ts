import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/** Matches mentos-frontend's `AppNotification["type"]` exactly. */
export enum NotificationType {
  Payment = 'payment',
  Lease = 'lease',
  Maintenance = 'maintenance',
  Billing = 'billing',
  System = 'system',
}

/**
 * A single in-app notification. Nothing in the backend creates these
 * automatically yet — `POST /notifications` ("Send announcements",
 * `notification.send`) is the only writer in this pass. A future dispatch
 * pipeline (triggered off tenant/lease/invoice/maintenance events, matched
 * against NotificationTemplate.triggerKey) would call the same insert path.
 */
@Entity('notifications')
export class Notification extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /** Lucide icon name, matching every other icon-bearing field in the schema. */
  @Column({ type: 'varchar', length: 40 })
  icon: string;
}
