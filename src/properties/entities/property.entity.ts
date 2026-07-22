import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Unit } from '../../units/entities/unit.entity';

/**
 * Matches mentos-frontend's `PropertyType` exactly (lib/types.ts). Each value
 * maps to a display label and a Residential/Commercial category — both
 * computed in PropertyResponseDto rather than stored, per ARCHITECTURE.md §3.
 */
export enum PropertyType {
  Apartment = 'apartment',
  Office = 'office',
  Hostel = 'hostel',
  House = 'house',
  Commercial = 'commercial',
}

export enum PropertyStatus {
  Active = 'active',
  Archived = 'archived',
}

/** type → typeLabel, ported from mentos-frontend/lib/api.ts PROP_TYPE_LABELS. */
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.Apartment]: 'Apartments',
  [PropertyType.Office]: 'Office suites',
  [PropertyType.Hostel]: 'Hostel rooms',
  [PropertyType.House]: 'Houses/Villas',
  [PropertyType.Commercial]: 'Retail units',
};

/** type → cat, ported from mentos-frontend/lib/api.ts PROP_TYPE_CATS. */
export const PROPERTY_TYPE_CATS: Record<PropertyType, 'Residential' | 'Commercial'> = {
  [PropertyType.Apartment]: 'Residential',
  [PropertyType.House]: 'Residential',
  [PropertyType.Hostel]: 'Residential',
  [PropertyType.Office]: 'Commercial',
  [PropertyType.Commercial]: 'Commercial',
};

/**
 * A rental property. `code` (P-01, P-02…) is the frontend-facing id — see
 * ARCHITECTURE.md §1. Shape mirrors mentos-frontend's `Property` exactly:
 * `area` is the neighborhood, `owner` is the landlord's display name (free
 * text, not a User reference).
 */
@Entity('properties')
export class Property extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: PropertyType })
  type: PropertyType;

  @Column({ type: 'varchar', length: 100 })
  area: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 255 })
  owner: string;

  @Column({ type: 'enum', enum: PropertyStatus, default: PropertyStatus.Active })
  status: PropertyStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  amenities: string[];

  @OneToMany(() => Unit, (unit) => unit.property)
  units: Unit[];

  get typeLabel(): string {
    return PROPERTY_TYPE_LABELS[this.type];
  }

  get cat(): 'Residential' | 'Commercial' {
    return PROPERTY_TYPE_CATS[this.type];
  }
}
