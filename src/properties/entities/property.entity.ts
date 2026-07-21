import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Unit } from '../../units/entities/unit.entity';

export enum PropertyType {
  Residential = 'residential',
  Commercial = 'commercial',
  Mixed = 'mixed',
}

export enum PropertyStatus {
  Active = 'active',
  Archived = 'archived',
}

/**
 * A rental property — the top-level entity in the hierarchy. A property
 * contains one or more units (apartments, offices, etc). The `code` is
 * user-visible (P-01, P-02…) and serialized as `id` in responses.
 */
@Entity('properties')
export class Property extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode: string | null;

  @Column({ type: 'enum', enum: PropertyType, default: PropertyType.Residential })
  type: PropertyType;

  @Column({ type: 'enum', enum: PropertyStatus, default: PropertyStatus.Active })
  status: PropertyStatus;

  /** Total count of units in this property — denormalized for quick display. */
  @Column({ type: 'int', default: 0 })
  unitCount: number;

  @OneToMany(() => Unit, (unit) => unit.property)
  units: Unit[];

  /** For the frontend's property.typeLabel denormalized field. */
  get typeLabel(): string {
    const labels: Record<PropertyType, string> = {
      [PropertyType.Residential]: 'Residential',
      [PropertyType.Commercial]: 'Commercial',
      [PropertyType.Mixed]: 'Mixed',
    };
    return labels[this.type] || this.type;
  }
}
