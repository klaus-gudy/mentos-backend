import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreatePropertyDto, PropertyResponseDto, UpdatePropertyDto } from './dto/property.dto';
import { Property, PropertyStatus } from './entities/property.entity';

/** Fallback when addProperty's amenities list is omitted or empty — ported from mentos-frontend/lib/api.ts. */
const DEFAULT_AMENITIES = ['Parking', '24/7 security'];

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly properties: Repository<Property>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Allocates the next `P-01` code (zero-padded, per the frontend seed) and
   * inserts in one transaction so two concurrent creates cannot collide.
   */
  async create(dto: CreatePropertyDto): Promise<PropertyResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Property);
      await manager.query('LOCK TABLE properties IN SHARE ROW EXCLUSIVE MODE');

      const row = await repo
        .createQueryBuilder('property')
        .select('COALESCE(MAX(CAST(SUBSTRING(property.code FROM 3) AS INTEGER)), 0)', 'max')
        .getRawOne<{ max: string }>();
      const seq = parseInt(row?.max ?? '0', 10) + 1;

      const property = new Property();
      property.code = `P-${String(seq).padStart(2, '0')}`;
      property.name = dto.name;
      property.type = dto.type;
      property.area = dto.area || '—';
      property.city = dto.city || 'Dar es Salaam';
      property.owner = dto.owner || '—';
      property.status = PropertyStatus.Active;
      property.description = dto.description ?? '';
      property.amenities = dto.amenities?.length ? dto.amenities : DEFAULT_AMENITIES;

      const saved = await repo.save(property);
      return PropertyResponseDto.from(saved);
    });
  }

  async findAll(): Promise<PropertyResponseDto[]> {
    const properties = await this.properties.find({ order: { createdAt: 'ASC' } });
    return PropertyResponseDto.fromMany(properties);
  }

  async findByCodeOrFail(code: string): Promise<Property> {
    const property = await this.properties.findOne({ where: { code } });
    if (!property) {
      throw new NotFoundException(`Property "${code}" not found`);
    }
    return property;
  }

  async findOne(code: string): Promise<PropertyResponseDto> {
    const property = await this.properties.findOne({
      where: { code },
      relations: ['units', 'units.tenant'],
    });
    if (!property) {
      throw new NotFoundException(`Property "${code}" not found`);
    }
    property.units?.sort((a, b) => a.code.localeCompare(b.code));
    return PropertyResponseDto.from(property, true);
  }

  async update(code: string, dto: UpdatePropertyDto): Promise<PropertyResponseDto> {
    const property = await this.findByCodeOrFail(code);

    if (dto.name !== undefined) property.name = dto.name;
    if (dto.type !== undefined) property.type = dto.type;
    if (dto.area !== undefined) property.area = dto.area;
    if (dto.city !== undefined) property.city = dto.city;
    if (dto.owner !== undefined) property.owner = dto.owner;
    if (dto.status !== undefined) property.status = dto.status;
    if (dto.description !== undefined) property.description = dto.description;
    if (dto.amenities !== undefined) property.amenities = dto.amenities;

    await this.properties.save(property);
    return PropertyResponseDto.from(property);
  }

  async archive(code: string): Promise<PropertyResponseDto> {
    const property = await this.findByCodeOrFail(code);
    property.status = PropertyStatus.Archived;
    await this.properties.save(property);
    return PropertyResponseDto.from(property);
  }
}
