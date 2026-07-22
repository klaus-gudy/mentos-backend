import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PropertiesService } from '../properties/properties.service';
import { CreateUnitDto, UnitResponseDto, UpdateUnitDto } from './dto/unit.dto';
import { Unit } from './entities/unit.entity';

/** Postgres error code for a unique-constraint violation. */
const UNIQUE_VIOLATION = '23505';

/** type → default bed count when `beds` is omitted — ported from mentos-frontend/lib/api.ts. */
function bedsFromType(type: string): number {
  const map: Record<string, number> = { Studio: 1, '1BR': 1, '2BR': 2, '3BR': 3 };
  return map[type] ?? 0;
}

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly units: Repository<Unit>,
    private readonly properties: PropertiesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a unit within a property. The code is `U-{propertyNumber}{seq}`
   * (e.g. property P-01's first unit is U-101) — ported from the frontend
   * seed's numbering, not its mock `addUnit` (which uses a timestamp; the
   * sequential code is the documented convention, ARCHITECTURE.md §1).
   */
  async create(propertyCode: string, dto: CreateUnitDto): Promise<UnitResponseDto> {
    const property = await this.properties.findByCodeOrFail(propertyCode);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Unit);
      await manager.query('LOCK TABLE units IN SHARE ROW EXCLUSIVE MODE');

      const propertyNumber = parseInt(propertyCode.replace(/^\D+/, ''), 10);
      const row = await repo
        .createQueryBuilder('unit')
        .select('COUNT(*)', 'count')
        .where('unit.propertyId = :propId', { propId: property.id })
        .getRawOne<{ count: string }>();
      const seq = parseInt(row?.count ?? '0', 10) + 1;

      const type = dto.type || '1BR';
      const rent = dto.rent;

      const unit = new Unit();
      unit.code = `U-${propertyNumber}${String(seq).padStart(2, '0')}`;
      unit.propertyId = property.id;
      unit.no = dto.no;
      unit.floor = dto.floor ?? 1;
      unit.type = type;
      unit.size = dto.size ?? 100;
      unit.rent = rent;
      unit.deposit = rent * 2;
      unit.beds = dto.beds ?? bedsFromType(type);
      unit.bathrooms = dto.bathrooms ?? 1;
      unit.block = dto.block ?? null;
      unit.minTenure = dto.minTenure ?? 12;
      unit.amenities = dto.amenities ?? [];
      unit.tenantId = null;

      try {
        const saved = await repo.save(unit);
        saved.property = property;
        return UnitResponseDto.from(saved);
      } catch (err) {
        if (this.isUniqueViolation(err)) {
          throw new ConflictException(
            `Unit "${dto.no}" already exists in property "${propertyCode}"`,
          );
        }
        throw err;
      }
    });
  }

  private isUniqueViolation(err: unknown): boolean {
    return typeof err === 'object' && err !== null && (err as { code?: string }).code === UNIQUE_VIOLATION;
  }

  /** All units in one property, sorted by code — used by the property detail endpoint. */
  async findByPropertyCode(propertyCode: string): Promise<UnitResponseDto[]> {
    const property = await this.properties.findByCodeOrFail(propertyCode);
    const units = await this.units.find({
      where: { propertyId: property.id },
      relations: ['tenant'],
      order: { code: 'ASC' },
    });
    return UnitResponseDto.fromMany(units);
  }

  /** All units across every property — mirrors the frontend's flat `api.units()`. */
  async findAll(): Promise<UnitResponseDto[]> {
    const units = await this.units.find({ relations: ['tenant'], order: { code: 'ASC' } });
    return UnitResponseDto.fromMany(units);
  }

  async findByCodeOrFail(code: string): Promise<Unit> {
    const unit = await this.units.findOne({ where: { code }, relations: ['property', 'tenant'] });
    if (!unit) {
      throw new NotFoundException(`Unit "${code}" not found`);
    }
    return unit;
  }

  async findOne(code: string): Promise<UnitResponseDto> {
    return UnitResponseDto.from(await this.findByCodeOrFail(code));
  }

  /**
   * Status and tenantId are not accepted here — occupancy changes only
   * through lease actions (Sprint 4), keeping a single writer for that state.
   */
  async update(code: string, dto: UpdateUnitDto): Promise<UnitResponseDto> {
    const unit = await this.findByCodeOrFail(code);

    if (dto.no !== undefined) unit.no = dto.no;
    if (dto.floor !== undefined) unit.floor = dto.floor;
    if (dto.type !== undefined) unit.type = dto.type;
    if (dto.size !== undefined) unit.size = dto.size;
    if (dto.beds !== undefined) unit.beds = dto.beds;
    if (dto.bathrooms !== undefined) unit.bathrooms = dto.bathrooms;
    if (dto.block !== undefined) unit.block = dto.block;
    if (dto.minTenure !== undefined) unit.minTenure = dto.minTenure;
    if (dto.amenities !== undefined) unit.amenities = dto.amenities;
    if (dto.rent !== undefined) {
      unit.rent = dto.rent;
      unit.deposit = dto.rent * 2; // deposit stays 2× rent, matching addUnit/updateUnit
    }

    try {
      await this.units.save(unit);
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(`Unit "${unit.no}" already exists in this property`);
      }
      throw err;
    }
    return this.findOne(code);
  }

  /**
   * Occupies a unit for a tenant — called by LeasesService.create(), within
   * its transaction. Takes the caller's EntityManager (not the injected
   * repository) so this write commits or rolls back atomically with the
   * lease/invoice/tenant writes it's part of.
   */
  async occupy(manager: EntityManager, unitId: string, tenantId: string): Promise<void> {
    await manager.getRepository(Unit).update(unitId, { tenantId, status: 'occupied' as Unit['status'] });
  }

  /**
   * Clears occupancy — called by TenantsService.blacklist() and
   * LeasesService.terminate(), within their transactions; see `occupy()`.
   */
  async vacate(manager: EntityManager, unitId: string): Promise<void> {
    await manager.getRepository(Unit).update(unitId, { tenantId: null, status: 'vacant' as Unit['status'] });
  }
}
