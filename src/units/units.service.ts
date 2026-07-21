import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PropertiesService } from '../properties/properties.service';
import { CreateUnitDto, UnitResponseDto, UpdateUnitDto } from './dto/unit.dto';
import { Unit } from './entities/unit.entity';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly units: Repository<Unit>,
    private readonly properties: PropertiesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a unit within a property. The code is generated per-property:
   * U-101 means property P-01, unit 01 (within that property).
   */
  async create(propertyCode: string, dto: CreateUnitDto): Promise<UnitResponseDto> {
    const property = await this.properties.findByCodeOrFail(propertyCode);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Unit);
      await manager.query('LOCK TABLE units IN SHARE ROW EXCLUSIVE MODE');

      // Get the property sequence from its code (P-01 → 01)
      const propSeq = propertyCode.replace(/^\D+/, '').padStart(2, '0');

      // Find the highest unit number for this property
      const row = await repo
        .createQueryBuilder('unit')
        .select('COALESCE(MAX(CAST(SUBSTRING(unit.code FROM 5) AS INTEGER)), 0)', 'max')
        .where('unit.propertyId = :propId', { propId: property.id })
        .getRawOne<{ max: string }>();

      const unit = new Unit();
      unit.code = `U-${propSeq}${String(parseInt(row?.max ?? '0', 10) + 1).padStart(2, '0')}`;
      unit.propertyId = property.id;
      unit.unitNumber = dto.unitNumber;
      unit.description = dto.description ?? null;
      unit.type = dto.type;
      unit.monthlyRent = dto.monthlyRent ?? null;
      unit.deposit = dto.deposit ?? null;
      unit.floorNumber = dto.floorNumber ?? null;
      unit.hasBalcony = dto.hasBalcony ?? false;
      unit.hasParkingSpace = dto.hasParkingSpace ?? false;
      unit.amenities = dto.amenities ?? null;

      const saved = await repo.save(unit);

      // Update the property's unit count
      const count = await repo.count({ where: { propertyId: property.id } });
      await this.properties.updateUnitCount(property.id, count);

      return UnitResponseDto.from(saved);
    });
  }

  async findByPropertyCode(propertyCode: string): Promise<UnitResponseDto[]> {
    const property = await this.properties.findByCodeOrFail(propertyCode);
    const units = await this.units.find({
      where: { propertyId: property.id },
      order: { code: 'ASC' },
    });
    return units.map((u) => UnitResponseDto.from(u));
  }

  async findByCodeOrFail(code: string): Promise<Unit> {
    const unit = await this.units.findOne({ where: { code }, relations: ['property'] });
    if (!unit) {
      throw new NotFoundException(`Unit "${code}" not found`);
    }
    return unit;
  }

  async findOne(code: string): Promise<UnitResponseDto> {
    const unit = await this.findByCodeOrFail(code);
    return UnitResponseDto.from(unit);
  }

  async update(code: string, dto: UpdateUnitDto): Promise<UnitResponseDto> {
    const unit = await this.findByCodeOrFail(code);

    if (dto.unitNumber !== undefined) {
      unit.unitNumber = dto.unitNumber;
    }
    if (dto.description !== undefined) {
      unit.description = dto.description ?? null;
    }
    if (dto.type !== undefined) {
      unit.type = dto.type;
    }
    if (dto.status !== undefined) {
      unit.status = dto.status;
    }
    if (dto.monthlyRent !== undefined) {
      unit.monthlyRent = dto.monthlyRent ?? null;
    }
    if (dto.deposit !== undefined) {
      unit.deposit = dto.deposit ?? null;
    }
    if (dto.floorNumber !== undefined) {
      unit.floorNumber = dto.floorNumber ?? null;
    }
    if (dto.hasBalcony !== undefined) {
      unit.hasBalcony = dto.hasBalcony;
    }
    if (dto.hasParkingSpace !== undefined) {
      unit.hasParkingSpace = dto.hasParkingSpace;
    }
    if (dto.amenities !== undefined) {
      unit.amenities = dto.amenities ?? null;
    }

    await this.units.save(unit);
    return this.findOne(code);
  }
}
