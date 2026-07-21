import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Property } from '../../properties/entities/property.entity';

export enum UnitType {
  Studio = 'studio',
  OneBedroom = '1br',
  TwoBedroom = '2br',
  ThreeBedroom = '3br',
  Office = 'office',
  Commercial = 'commercial',
}

export enum UnitStatus {
  Vacant = 'vacant',
  Occupied = 'occupied',
  Maintenance = 'maintenance',
  Archived = 'archived',
}

/**
 * A rentable unit within a property. The code (U-101, U-102…) is generated
 * per-property: U-n means property n (the nth digit of the property's code),
 * followed by a two-digit unit number within that property.
 *
 * This preserves the frontend's existing ID scheme, which keys on these codes.
 */
@Entity('units')
export class Unit extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Index()
  @Column({ type: 'uuid' })
  propertyId: string;

  @ManyToOne(() => Property, (property) => property.units, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column({ type: 'varchar', length: 100 })
  unitNumber: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: UnitType })
  type: UnitType;

  @Column({ type: 'enum', enum: UnitStatus, default: UnitStatus.Vacant })
  status: UnitStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyRent: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  deposit: number | null;

  @Column({ type: 'int', nullable: true })
  floorNumber: number | null;

  @Column({ type: 'boolean', default: false })
  hasBalcony: boolean;

  @Column({ type: 'boolean', default: false })
  hasParkingSpace: boolean;

  @Column({ type: 'text', nullable: true })
  amenities: string | null;

  get typeLabel(): string {
    const labels: Record<UnitType, string> = {
      [UnitType.Studio]: 'Studio',
      [UnitType.OneBedroom]: '1 Bedroom',
      [UnitType.TwoBedroom]: '2 Bedroom',
      [UnitType.ThreeBedroom]: '3 Bedroom',
      [UnitType.Office]: 'Office',
      [UnitType.Commercial]: 'Commercial',
    };
    return labels[this.type] || this.type;
  }

  get statusLabel(): string {
    const labels: Record<UnitStatus, string> = {
      [UnitStatus.Vacant]: 'Vacant',
      [UnitStatus.Occupied]: 'Occupied',
      [UnitStatus.Maintenance]: 'In Maintenance',
      [UnitStatus.Archived]: 'Archived',
    };
    return labels[this.status] || this.status;
  }
}
